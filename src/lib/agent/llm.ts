// The one door every AI call in the app goes through.
// Protections: the answer must match a Zod shape, a per-campaign call budget, a 25s time limit
// with one retry, refused or cut-off answers count as failures (callers then use a template),
// a saved-answer cache, and a clean "no key" result instead of a crash.
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import { db, llmCache } from "@/db";

// Runtime model for the agent. Sonnet 5.5 per the approved plan; override with AGENT_MODEL.
export const AGENT_MODEL = process.env.AGENT_MODEL || "claude-sonnet-5-5";

// Bump when a prompt changes, so old cached answers are not reused for the new prompt.
export const PROMPT_VERSION = "2026-10-25.2";

export type LlmFailure =
  | "NO_API_KEY"
  | "BUDGET_EXCEEDED"
  | "REFUSED"
  | "TRUNCATED"
  | "INVALID_OUTPUT"
  | "API_ERROR";

export type LlmResult<T> =
  | { ok: true; data: T; model: string; cached: boolean }
  | { ok: false; reason: LlmFailure; message: string };

// Hard cap on AI calls for one campaign (match, plan loop and notice share it).
export class CallBudget {
  used = 0;
  constructor(readonly max = 12) {}
  take(): boolean {
    if (this.used >= this.max) return false;
    this.used += 1;
    return true;
  }
}

let client: Anthropic | null = null;
export function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic({ timeout: 25_000, maxRetries: 1 });
  return client;
}

// Server-side refusal fallback: if the model declines on safety grounds, the API reruns the
// request on a fallback model inside the same call. Claude API only.
export function fallbackParams() {
  return {
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default" as const,
  };
}

// Wraps outside text (CPSC records, product listings) so the model treats it as data.
// Strips anything that looks like our own tags and invisible characters first.
export function untrusted(label: string, text: string): string {
  const clean = text
    .replace(/<\/?untrusted_[a-z_]*>/gi, "")
    .replace(/[​-‍⁠﻿]/g, "");
  return `<untrusted_${label}>\n${clean}\n</untrusted_${label}>`;
}

function cacheKey(task: string, inputs: unknown): string {
  return createHash("sha256")
    .update(
      JSON.stringify({ task, inputs, model: AGENT_MODEL, v: PROMPT_VERSION }),
    )
    .digest("hex");
}

export async function callStructured<S extends z.ZodType>(opts: {
  task: string;
  schema: S;
  system: string;
  user: string;
  budget: CallBudget;
  maxTokens?: number;
  useCache?: boolean;
}): Promise<LlmResult<z.infer<S>>> {
  const key = cacheKey(opts.task, { system: opts.system, user: opts.user });
  if (opts.useCache !== false) {
    const [hit] = await db.select().from(llmCache).where(eq(llmCache.key, key));
    if (hit)
      return {
        ok: true,
        data: hit.output as z.infer<S>,
        model: hit.model,
        cached: true,
      };
  }

  const anthropic = getClient();
  if (!anthropic)
    return {
      ok: false,
      reason: "NO_API_KEY",
      message: "ANTHROPIC_API_KEY is not set",
    };
  if (!opts.budget.take()) {
    return {
      ok: false,
      reason: "BUDGET_EXCEEDED",
      message: `More than ${opts.budget.max} AI calls`,
    };
  }

  try {
    const response = await anthropic.beta.messages.parse({
      model: AGENT_MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      system: opts.system,
      messages: [{ role: "user", content: opts.user }],
      output_config: {
        format: betaZodOutputFormat(opts.schema),
        effort: "medium",
      },
      ...fallbackParams(),
    });

    if (response.stop_reason === "refusal") {
      return {
        ok: false,
        reason: "REFUSED",
        message: response.stop_details?.explanation ?? "refused",
      };
    }
    if (response.stop_reason === "max_tokens") {
      return { ok: false, reason: "TRUNCATED", message: "answer was cut off" };
    }
    const data = response.parsed_output;
    if (data == null)
      return {
        ok: false,
        reason: "INVALID_OUTPUT",
        message: "answer did not match the schema",
      };

    if (opts.useCache !== false) {
      await db
        .insert(llmCache)
        .values({ key, task: opts.task, model: response.model, output: data })
        .onConflictDoNothing();
    }
    return { ok: true, data, model: response.model, cached: false };
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `HTTP ${err.status}: ${err.message}`
        : String(err);
    return { ok: false, reason: "API_ERROR", message };
  }
}

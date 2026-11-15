export type TagKind = "model" | "rule" | "tool" | "you";

const LABEL: Record<TagKind, string> = {
  model: "Model",
  rule: "Rule",
  tool: "Tool",
  you: "You",
};

// Each kind has its own glyph as well as its own box (see .tag-* in globals.css), so the four
// stay distinct without colour: diamond, square, triangle, dot.
function Glyph({ kind }: { kind: TagKind }) {
  return (
    <svg className="tag-glyph" viewBox="0 0 10 10" aria-hidden="true">
      {kind === "model" && (
        <polygon
          points="5,0.8 9.2,5 5,9.2 0.8,5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      )}
      {kind === "rule" && <rect x="1" y="1" width="8" height="8" />}
      {kind === "tool" && <polygon points="1,9 5,1 9,9" />}
      {kind === "you" && <circle cx="5" cy="5" r="4" />}
    </svg>
  );
}

export function Tag({ kind }: { kind: TagKind }) {
  return (
    <span className={`tag tag-${kind}`}>
      <Glyph kind={kind} />
      {LABEL[kind]}
    </span>
  );
}

import { Icon, type IconName } from "./Icon";

export type TagKind = "model" | "rule" | "tool" | "you";

const TAGS: Record<TagKind, { label: string; icon: IconName }> = {
  model: { label: "Model", icon: "spark" },
  rule: { label: "Rule", icon: "scale" },
  tool: { label: "Tool", icon: "code" },
  you: { label: "You", icon: "person" },
};

export function Tag({ kind }: { kind: TagKind }) {
  const { label, icon } = TAGS[kind];
  return (
    <span className={`tag tag-${kind}`}>
      <Icon name={icon} />
      {label}
    </span>
  );
}

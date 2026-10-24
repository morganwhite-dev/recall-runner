export type IconName =
  | "scale"
  | "spark"
  | "code"
  | "person"
  | "check"
  | "arrow"
  | "loop"
  | "orders"
  | "key"
  | "refund"
  | "payout"
  | "truck"
  | "bell";

// Inline SVG symbol set. Render <IconSprite /> once per page, then use <Icon />.
export function IconSprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <symbol id="scale" viewBox="0 0 24 24">
        <path d="M12 3v18M7 21h10M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7zM19 7l-3 7a3.5 3.5 0 0 0 6 0l-3-7z" />
      </symbol>
      <symbol id="spark" viewBox="0 0 24 24">
        <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" />
      </symbol>
      <symbol id="code" viewBox="0 0 24 24">
        <path d="M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14" />
      </symbol>
      <symbol id="person" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
      </symbol>
      <symbol id="check" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12.5l3 3 5-6" />
      </symbol>
      <symbol id="arrow" viewBox="0 0 24 24">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </symbol>
      <symbol id="loop" viewBox="0 0 24 24">
        <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4" />
      </symbol>
      <symbol id="orders" viewBox="0 0 24 24">
        <path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7" />
      </symbol>
      <symbol id="key" viewBox="0 0 24 24">
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12l9-9M16 7l3 3" />
      </symbol>
      <symbol id="refund" viewBox="0 0 24 24">
        <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />
      </symbol>
      <symbol id="payout" viewBox="0 0 24 24">
        <path d="M7 17L17 7M9 7h8v8" />
      </symbol>
      <symbol id="truck" viewBox="0 0 24 24">
        <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="1.8" />
        <circle cx="17" cy="18" r="1.8" />
      </symbol>
      <symbol id="bell" viewBox="0 0 24 24">
        <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
      </symbol>
    </svg>
  );
}

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}

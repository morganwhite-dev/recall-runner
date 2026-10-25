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
  | "bell"
  | "wrench"
  | "clock"
  | "minus"
  | "chev"
  | "ext"
  | "lock"
  | "box"
  | "info"
  | "pause"
  | "left"
  | "right"
  | "help"
  | "store"
  | "clockdash"
  | "shield"
  | "match"
  | "ban"
  | "alert"
  | "quote"
  | "copy";

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
      <symbol id="wrench" viewBox="0 0 24 24">
        <path d="M14.5 6a4.5 4.5 0 0 0 5.5 5.5L11 20.5a2.1 2.1 0 0 1-3-3l9-9" />
        <path d="M14.5 6L17 3.5" />
      </symbol>
      <symbol id="clock" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </symbol>
      <symbol id="minus" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8" />
      </symbol>
      <symbol id="chev" viewBox="0 0 24 24">
        <path d="M6 9l6 6 6-6" />
      </symbol>
      <symbol id="ext" viewBox="0 0 24 24">
        <path d="M14 4h6v6M20 4l-9 9M18 14v5H5V6h5" />
      </symbol>
      <symbol id="lock" viewBox="0 0 24 24">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </symbol>
      <symbol id="box" viewBox="0 0 24 24">
        <path d="M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8" />
      </symbol>
      <symbol id="info" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </symbol>
      <symbol id="pause" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M10 9v6M14 9v6" />
      </symbol>
      <symbol id="left" viewBox="0 0 24 24">
        <path d="M15 18l-6-6 6-6" />
      </symbol>
      <symbol id="right" viewBox="0 0 24 24">
        <path d="M9 18l6-6-6-6" />
      </symbol>
      <symbol id="help" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01" />
      </symbol>
      <symbol id="store" viewBox="0 0 24 24">
        <path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0A2.7 2.7 0 0 0 20 9M10 20v-5h4v5" />
      </symbol>
      <symbol id="clockdash" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" strokeDasharray="3.2 3" />
        <path d="M12 7v5l3 2" />
      </symbol>
      <symbol id="shield" viewBox="0 0 24 24">
        <path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z" />
        <path d="M8.5 12l2.5 2.5 4.5-5" />
      </symbol>
      <symbol id="match" viewBox="0 0 24 24">
        <circle cx="9" cy="12" r="5.5" />
        <circle cx="15" cy="12" r="5.5" />
      </symbol>
      <symbol id="ban" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M5.6 5.6l12.8 12.8" />
      </symbol>
      <symbol id="alert" viewBox="0 0 24 24">
        <path d="M12 4l9 16H3z" />
        <path d="M12 10v4M12 17v.5" />
      </symbol>
      <symbol id="quote" viewBox="0 0 24 24">
        <path d="M6 8h4v4c0 3-1.5 4.5-4 5M14 8h4v4c0 3-1.5 4.5-4 5" />
      </symbol>
      <symbol id="copy" viewBox="0 0 24 24">
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15V6a2 2 0 0 1 2-2h8" />
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

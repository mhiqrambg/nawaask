/** NawaAsk brand mark. Kept custom: it is the product identity, not a generic glyph. */
export function IconLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="6"
        fill="currentColor"
        opacity="0.12"
      />
      <path
        d="M6.5 17V7h1.8l7.4 7.4V7h1.8v10h-1.8L8.3 9.6V17H6.5z"
        fill="currentColor"
      />
    </svg>
  );
}

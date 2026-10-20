/** The four code-pair colours as a mark, so the brand reads as the code it issues. */
export function Logo({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="4" width="13" height="11" rx="3" fill="var(--code-1)" />
      <rect x="17" y="4" width="13" height="11" rx="3" fill="var(--code-2)" />
      <rect x="2" y="17" width="13" height="11" rx="3" fill="var(--code-3)" />
      <rect x="17" y="17" width="13" height="11" rx="3" fill="var(--code-4)" />
    </svg>
  );
}

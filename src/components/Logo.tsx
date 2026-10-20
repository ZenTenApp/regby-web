import { useState } from 'react';

import logo1 from '@/assets/regby-logo-1.svg';
import logo2 from '@/assets/regby-logo-2.svg';

/** The wordmark variants, in tap order. Imported rather than in `public/` so
 *  the build hashes them and the year-long svg cache never serves a stale one. */
const VARIANTS: readonly string[] = [logo1, logo2];

/** The ReGBY wordmark as the page heading; a tap cycles through the variants. */
export function Logo() {
  const [variant, setVariant] = useState(0);
  return (
    <h1 className="brand-logo">
      <button
        type="button"
        aria-label="ReGBY, switch logo style"
        onClick={() => setVariant((current) => (current + 1) % VARIANTS.length)}
      >
        <img src={VARIANTS[variant]} alt="" />
      </button>
    </h1>
  );
}

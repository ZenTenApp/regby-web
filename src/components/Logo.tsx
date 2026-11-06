import logo from '@/assets/regby-logo.svg';

/** The ReGBY wordmark as the page heading. Imported rather than in `public/`
 *  so the build hashes it and the year-long svg cache never serves a stale one. */
export function Logo() {
  return (
    <h1 className="brand-logo">
      <img src={logo} alt="ReGBY" />
    </h1>
  );
}

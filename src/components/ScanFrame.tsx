/* Corner brackets from the Figma scanner, in its 254 px box: each arm runs
   75 px from the corner around the box's 23 px radius, centred on the edge. */
const BRACKETS: readonly string[] = [
  'M0 75V23A23 23 0 0 1 23 0H75',
  'M179 0H231A23 23 0 0 1 254 23V75',
  'M254 179V231A23 23 0 0 1 231 254H179',
  'M75 254H23A23 23 0 0 1 0 231V179',
];

/** The scanner's corner brackets, fitted to their container. Shared by the
 *  live camera and the merchant's empty-content QR placeholder. */
export function ScanFrame() {
  return (
    <svg className="scan-frame" viewBox="0 0 254 254" aria-hidden="true">
      {BRACKETS.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

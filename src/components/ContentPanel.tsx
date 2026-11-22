import type { ReactNode } from 'react';

interface ContentPanelProps {
  /** Sender line, or on the redeem screen what failed (else the strip stays empty). */
  head?: ReactNode;
  /** Copy action or a note, or on the redeem screen what to do after a failure. */
  foot?: ReactNode;
  children: ReactNode;
}

/** The redeemed-text frame: the redeem screen draws it empty and the content
 *  screen fills it, so the text reads as arriving in place. */
export function ContentPanel({ head, foot, children }: ContentPanelProps) {
  return (
    <div className="content-panel">
      <div className="content-panel-head">{head}</div>
      <div className="content-panel-body">{children}</div>
      <div className="content-panel-foot">{foot}</div>
    </div>
  );
}

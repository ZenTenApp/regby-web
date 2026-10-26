import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import EmptyQrIcon from '@/assets/icons/empty-qr.svg?react';
import { isBlankContent } from '@/services/regby/protocol';

type QrState = { kind: 'pending' } | { kind: 'ready'; src: string } | { kind: 'too-long' };

/** `value` as a QR, rendered locally; nothing leaves the page. Low error
 *  correction buys the most capacity, since a screen-to-camera scan is clean. */
export function QrCode({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<QrState>({ kind: 'pending' });

  useEffect(() => {
    if (isBlankContent(value)) return;
    let live = true;
    // A literal colour: the image is drawn off-DOM, where CSS tokens do not apply.
    // Keep in sync with `--qr-ink` in index.css.
    QRCode.toDataURL(value, { margin: 0, width: 528, errorCorrectionLevel: 'L', color: { dark: '#2e2e34' } })
      .then((src) => live && setState({ kind: 'ready', src }))
      // The only failure for a valid string is exceeding QR capacity (~2.9 KB).
      .catch(() => live && setState({ kind: 'too-long' }));
    return () => {
      live = false;
    };
  }, [value]);

  // Empty content has nothing to encode: show the placeholder where the QR would be.
  if (isBlankContent(value)) {
    return (
      <div className="qr qr-empty" role="img" aria-label="No text shared">
        <EmptyQrIcon />
      </div>
    );
  }
  if (state.kind === 'ready') return <img className="qr" src={state.src} alt={label} />;
  if (state.kind === 'too-long') return <p className="qr qr-message">Too long for a QR. Share the code below instead.</p>;
  return <div className="qr" />;
}

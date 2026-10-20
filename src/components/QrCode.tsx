import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** The code as a QR, rendered locally; nothing leaves the page. */
export function QrCode({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(value, { margin: 0, width: 528, errorCorrectionLevel: 'M', color: { dark: '#2b2b2f' } })
      .then((url) => live && setSrc(url))
      .catch(() => live && setSrc(null));
    return () => {
      live = false;
    };
  }, [value]);

  return src ? <img className="qr" src={src} alt={`QR code for ${value}`} /> : <div className="qr" />;
}

/**
 * Customer step 1: square camera on top, the code boxes below. A scanned QR
 * carries the merchant's text itself and opens it directly; a full eight
 * typed digits redeems the code through the broker. No submit button.
 */
import { useState } from 'react';

import { CodeInput } from '@/components/Code';
import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { QrScanner } from '@/components/QrScanner';
import { Spinner } from '@/components/Spinner';
import { REGBY_CODE_LENGTH } from '@/config/regby';
import { useAction } from '@/lib/use-action';
import { regbyErrorText } from '@/services/regby/protocol';

interface CustomerRedeemScreenProps {
  onRedeem: (code: string) => Promise<void>;
  onScanned: (content: string) => void;
  onBack: () => void;
}

export function CustomerRedeemScreen({ onRedeem, onScanned, onBack }: CustomerRedeemScreenProps) {
  const [digits, setDigits] = useState('');
  const redeem = async (code: string) => {
    // Drop the keyboard so the result is not hidden behind it.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    try {
      await onRedeem(code);
    } catch (err) {
      setDigits('');
      throw err;
    }
  };
  const { run, busy, error, setError } = useAction(redeem, regbyErrorText);

  const onChange = (next: string) => {
    setDigits(next);
    setError(null);
    if (next.length === REGBY_CODE_LENGTH) void run(next);
  };

  return (
    <Page role="customer">
      <ScreenHeader role="customer" onBack={onBack} />
      <ScreenTitle title="Scan QR or Input Code" subtitle="Scan QR Code or enter ReGBY Code to continue." />

      <QrScanner onResult={onScanned} paused={busy} />

      <p className="code-caption">or enter Regby Code</p>
      <CodeInput value={digits} onChange={onChange} invalid={error !== null} disabled={busy} />

      {busy && (
        <p className="status">
          <Spinner />
          Redeeming…
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </Page>
  );
}

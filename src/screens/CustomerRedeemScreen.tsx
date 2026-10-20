/**
 * Customer step 1: square camera on top, the code boxes below. A scanned
 * QR or a full eight digits redeems at once; there is no submit button.
 */
import { useState } from 'react';

import { CodeInput } from '@/components/Code';
import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { QrScanner } from '@/components/QrScanner';
import { Spinner } from '@/components/Spinner';
import { REGBY_CODE_LENGTH } from '@/config/regby';
import { useAction } from '@/lib/use-action';
import { normalizeRegbyCode, regbyErrorText } from '@/services/regby/protocol';

const NOT_A_CODE = 'This QR is not a ReGBY Code.';

interface CustomerRedeemScreenProps {
  onRedeem: (code: string) => Promise<void>;
  onBack: () => void;
}

export function CustomerRedeemScreen({ onRedeem, onBack }: CustomerRedeemScreenProps) {
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

  const onScan = (text: string) => {
    const code = normalizeRegbyCode(text);
    if (code === null) {
      setError(NOT_A_CODE);
      return;
    }
    setDigits(code);
    void run(code);
  };

  return (
    <Page role="customer">
      <ScreenHeader role="customer" onBack={onBack} />
      <ScreenTitle title="Scan QR or Input Code" subtitle="Scan QR Code or enter ReGBY Code to continue." />

      <QrScanner onResult={onScan} paused={busy} />

      <p className="code-caption">or enter Regby Code</p>
      <CodeInput value={digits} onChange={onChange} invalid={error !== null} disabled={busy} />

      {busy && (
        <p className="status">
          <Spinner size={20} />
          Redeeming…
        </p>
      )}
      {error && <p className="error">{error}</p>}
    </Page>
  );
}

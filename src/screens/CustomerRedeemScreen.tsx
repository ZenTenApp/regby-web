/**
 * Customer step 1: the empty text box the redeemed text will fill, the code
 * boxes below. A full eight typed digits redeems the code through the broker;
 * no submit button. The merchant's QR needs no in-app scanner: it carries the
 * text itself, which a phone's own camera reads.
 */
import { useState } from 'react';

import { CodeInput } from '@/components/Code';
import { Page, ScreenHeader } from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { REGBY_CODE_LENGTH } from '@/config/regby';
import { useAction } from '@/lib/use-action';
import { regbyErrorText } from '@/services/regby/protocol';

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

  return (
    <Page role="customer">
      <ScreenHeader role="customer" onBack={onBack} />
      {/* Same box the content screen fills, so the redeem reads as the text arriving in place. */}
      <div className="content-box" aria-hidden="true" />
      <div className="code-after-content">
        <CodeInput value={digits} onChange={onChange} invalid={error !== null} disabled={busy} />
      </div>

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

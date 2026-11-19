/**
 * Customer step 1: the empty frame the redeemed text will fill, the code
 * boxes below. A full eight typed digits redeems the code through the broker;
 * no submit button. The merchant's QR needs no in-app scanner: it carries the
 * text itself, which a phone's own camera reads. A failed redeem marks the
 * frame's strips: ERROR on top, what to do below (after a conflict, ask for a
 * new code). Back from there clears the error, like Back from the text; only
 * Back from the empty frame signs out.
 */
import { TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { CodeInput } from '@/components/Code';
import { ContentPanel } from '@/components/ContentPanel';
import { Page, ScreenHeader } from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { ICON_SIZE } from '@/components/icon';
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
      <ScreenHeader role="customer" onBack={error === null ? onBack : () => setError(null)} />
      {/* Progress and errors sit in the frame the text will fill, so the code
          and Paste below keep the content screen's layout. */}
      <ContentPanel
        head={
          error !== null && (
            <span className="content-panel-error">
              <TriangleAlert size={ICON_SIZE} aria-hidden />
              ERROR
            </span>
          )
        }
        foot={
          error !== null && (
            <p className="content-panel-error-text" role="alert">
              {error}
            </p>
          )
        }
      >
        {busy && (
          <div className="content-panel-status">
            <p className="status" role="status">
              <Spinner />
              Redeeming…
            </p>
          </div>
        )}
      </ContentPanel>
      <div className="code-after-content">
        <CodeInput value={digits} onChange={onChange} disabled={busy} />
      </div>
    </Page>
  );
}

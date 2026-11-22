/**
 * Customer step 1: the empty frame the redeemed text will fill, the code
 * boxes below. A full eight typed digits redeems the code through the broker;
 * no submit button. The merchant's QR needs no in-app scanner: it carries the
 * text itself, which a phone's own camera reads. A failed redeem fills the
 * frame instead: the reason's icon and title on top, the icon large where the
 * text would be, what to do below. Back from there clears the failure, like
 * Back from the text; only Back from the empty frame signs out.
 */
import { Clock, Lock, Search, TriangleAlert, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { CodeInput } from '@/components/Code';
import { ContentPanel } from '@/components/ContentPanel';
import { Page, ScreenHeader } from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { ICON_SIZE } from '@/components/icon';
import { REGBY_CODE_LENGTH } from '@/config/regby';
import { useAction } from '@/lib/use-action';
import { REGBY_ERROR_TEXT, regbyErrorReason, type RegbyErrorReason } from '@/services/regby/protocol';

interface FailureView {
  Icon: LucideIcon;
  title: string;
}

/** The refusals the Figma draws each its own way. */
const FAILURE_VIEW: Partial<Record<RegbyErrorReason, FailureView>> = {
  regby_code_expired: { Icon: Clock, title: 'Code expired' },
  regby_code_locked: { Icon: Lock, title: 'Code locked' },
  regby_code_not_found: { Icon: Search, title: 'Code not found' },
};

/** Everything else: a code already redeemed, or the relays failing us. */
const GENERIC_FAILURE: FailureView = { Icon: TriangleAlert, title: 'Error encountered' };

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
  const { run, busy, error, setError } = useAction(redeem, regbyErrorReason);
  const failure =
    error === null ? null : { ...(FAILURE_VIEW[error] ?? GENERIC_FAILURE), text: REGBY_ERROR_TEXT[error] };

  const onChange = (next: string) => {
    setDigits(next);
    setError(null);
    if (next.length === REGBY_CODE_LENGTH) void run(next);
  };

  return (
    <Page role="customer">
      <ScreenHeader role="customer" onBack={error === null ? onBack : () => setError(null)} />
      {/* Progress and failures sit in the frame the text will fill, so the
          code and Paste below keep the content screen's layout. */}
      <ContentPanel
        head={
          failure && (
            <span className="content-panel-failure-title">
              <failure.Icon size={ICON_SIZE} />
              {failure.title}
            </span>
          )
        }
        foot={
          failure && (
            <p className="content-panel-failure-text" role="alert">
              {/* The title sits in another strip; announce it with the instruction. */}
              <span className="visually-hidden">{failure.title}. </span>
              {failure.text}
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
        {failure && (
          <div className="content-panel-failure-icon">
            <failure.Icon />
          </div>
        )}
      </ContentPanel>
      <div className="code-after-content">
        <CodeInput value={digits} onChange={onChange} disabled={busy} />
      </div>
    </Page>
  );
}

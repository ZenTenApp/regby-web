/**
 * Merchant step 2: the shared text as a QR (when enabled) and the minted code
 * as digits, counting down to the code's expiry, and switching to "redeemed"
 * when the broker reports a customer.
 */
import { CircleCheck, Clock, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CodeDisplay } from '@/components/Code';
import { CopyButton } from '@/components/CopyButton';
import { Page, ScreenHeader } from '@/components/Layout';
import { QrCode } from '@/components/QrCode';
import { Spinner } from '@/components/Spinner';
import { ICON_SIZE } from '@/components/icon';
import { npub, shortNpub } from '@/lib/npub';
import { useAction } from '@/lib/use-action';
import { useNow } from '@/lib/use-now';
import type { MintedCode } from '@/services/regby/client';
import { regbyErrorText } from '@/services/regby/protocol';

function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

interface MerchantCodeScreenProps {
  minted: MintedCode;
  /** The shared text itself, carried by the QR; the code is the typed path. */
  content: string;
  showQr: boolean;
  onRegenerate: () => Promise<void>;
  onBack: () => void;
}

export function MerchantCodeScreen({ minted, content, showQr, onRegenerate, onBack }: MerchantCodeScreenProps) {
  const now = useNow();
  const [customer, setCustomer] = useState<string | null>(null);
  const { run, busy, error } = useAction(onRegenerate, regbyErrorText);

  useEffect(() => {
    let live = true;
    setCustomer(null);
    void minted.delivered.then((pubkey) => live && setCustomer(pubkey));
    return () => {
      live = false;
    };
  }, [minted]);

  const remaining = minted.expiresAt - now;
  const phase = customer !== null ? 'redeemed' : remaining <= 0 ? 'expired' : 'live';

  return (
    <Page role="merchant">
      <ScreenHeader role="merchant" onBack={onBack} />
      {showQr && (
        <>
          <QrCode value={content} label="QR code of the shared text" />
          <p className="divider">or share ReGBY Code</p>
        </>
      )}

      {phase === 'live' && (
        <div className="code-status-row">
          <button
            type="button"
            className="icon-button"
            disabled={busy}
            aria-label="Generate a new code"
            onClick={() => void run()}
          >
            {busy ? <Spinner /> : <RotateCcw size={ICON_SIZE} />}
          </button>
          <p className="status">
            <Clock size={ICON_SIZE} />
            Expires in {formatRemaining(remaining)}
          </p>
          <CopyButton variant="icon" text={minted.code} label="code" />
        </div>
      )}
      {phase === 'expired' && (
        <p className="status code-status">
          Code expired.
          <button type="button" className="link-button" disabled={busy} onClick={() => void run()}>
            {busy ? 'Requesting…' : 'Request new code.'}
          </button>
        </p>
      )}
      {phase === 'redeemed' && customer !== null && (
        <p className="status code-status" data-tone="success">
          <CircleCheck size={ICON_SIZE} />
          Redeemed by {shortNpub(customer)}
          <CopyButton variant="icon" text={npub(customer)} label="customer npub" />
        </p>
      )}

      {/* Only the code expires; the QR carries the text itself and stays valid. */}
      <CodeDisplay code={phase === 'expired' ? '' : minted.code} />
      {error && <p className="error">{error}</p>}
    </Page>
  );
}

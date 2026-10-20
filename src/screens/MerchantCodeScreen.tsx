/**
 * Merchant step 2: the minted code as QR and digits, counting down to its
 * expiry, and switching to "redeemed" when the broker reports a customer.
 */
import { CircleCheck, Clock, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

import { CodeDisplay } from '@/components/Code';
import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { QrCode } from '@/components/QrCode';
import { Spinner } from '@/components/Spinner';
import { shortNpub } from '@/lib/npub';
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
  onRegenerate: () => Promise<void>;
  onBack: () => void;
}

export function MerchantCodeScreen({ minted, onRegenerate, onBack }: MerchantCodeScreenProps) {
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
      <ScreenTitle title="Payment Requested" subtitle="You've successfully created your Payment Request & Code." />

      <div className="code-panel" data-expired={phase === 'expired'}>
        <QrCode value={minted.code} />
        <p className="code-caption">or share Regby Code</p>
        <CodeDisplay code={minted.code} />
      </div>

      {phase === 'redeemed' && customer !== null && (
        <p className="status" data-tone="success">
          <CircleCheck size={20} />
          Redeemed by {shortNpub(customer)}
        </p>
      )}
      {phase === 'expired' && (
        <>
          <p className="status" data-tone="danger">
            <Clock size={20} />
            Code expired
          </p>
          <div className="stack stack-gap">
            <button type="button" className="btn btn-compact" disabled={busy} onClick={() => void run()}>
              {busy ? <Spinner size={22} /> : <RefreshCw size={22} />}
              Generate new code
            </button>
          </div>
          {error && <p className="error">{error}</p>}
        </>
      )}
      {phase === 'live' && (
        <p className="status">
          <Clock size={20} />
          Expires in {formatRemaining(remaining)}
        </p>
      )}
    </Page>
  );
}

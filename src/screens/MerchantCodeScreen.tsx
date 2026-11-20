/**
 * Merchant step 2: the shared text as a QR (when enabled) and the minted code
 * as digits, counting down to the code's expiry, and switching to "redeemed"
 * when the broker reports a customer. If anyone else typed the code in time,
 * nobody can tell whether the customer at the counter got the text, so the
 * code is void and, as after expiry, Generate is the only way on. A broker
 * that delivered other text is flagged.
 */
import { CircleCheck, Clock, RotateCcw, RotateCw, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Alert } from '@/components/Alert';
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
import { regbyErrorText, type CodeNotice } from '@/services/regby/protocol';

function formatRemaining(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

type CodePhase = 'live' | 'expired' | 'redeemed' | 'conflict';

/** The intent says who got the text; anyone refused after it means the code
 *  leaked, and outranks "redeemed" so the merchant does not go on. */
function codePhase(notices: readonly CodeNotice[], remaining: number): CodePhase {
  if (notices.some((notice) => !notice.redeemed)) return 'conflict';
  if (notices.some((notice) => notice.redeemed)) return 'redeemed';
  return remaining <= 0 ? 'expired' : 'live';
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
  const [notices, setNotices] = useState<readonly CodeNotice[]>([]);
  const { run, busy, error } = useAction(onRegenerate, regbyErrorText);

  useEffect(() => minted.watchNotices(setNotices), [minted]);

  const winner = notices.find((notice) => notice.redeemed);
  const tampered = winner?.textCheck === 'different';
  const remaining = minted.expiresAt - now;
  const phase = codePhase(notices, remaining);
  const codeVoid = phase === 'expired' || phase === 'conflict';

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
      {phase === 'expired' && <p className="status code-status">Code expired. Generate a new code.</p>}
      {phase === 'redeemed' && winner !== undefined && (
        <p className="status code-status" data-tone="success">
          <CircleCheck size={ICON_SIZE} />
          Redeemed by {shortNpub(winner.customer)}
          <CopyButton variant="icon" text={npub(winner.customer)} label="customer npub" />
        </p>
      )}
      {phase === 'conflict' && (
        <p className="status code-status" data-tone="warning" role="alert">
          <TriangleAlert size={ICON_SIZE} aria-hidden />
          <strong>Warning</strong> Please confirm with customer.
        </p>
      )}
      {tampered && (
        <Alert title="Text mismatch">
          ReGBY delivered different text than you shared. Do not rely on this exchange.
        </Alert>
      )}

      {/* Only the code dies, by expiry or conflict; the QR carries the text itself and stays valid. */}
      <CodeDisplay code={codeVoid ? '' : minted.code} />
      {codeVoid && (
        <button type="button" className="btn code-action" disabled={busy} onClick={() => void run()}>
          {busy ? <Spinner /> : <RotateCw size={ICON_SIZE} />}
          Generate
        </button>
      )}
      {error && <p className="error">{error}</p>}
    </Page>
  );
}

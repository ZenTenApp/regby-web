/**
 * Customer step 2: the merchant's text, shown exactly as written (line breaks
 * and spacing kept) and as plain text only, since it came through an
 * untrusted broker or off a scanned QR. Copy hands over the original verbatim.
 */
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { shortNpub } from '@/lib/npub';
import { displayableContent, isBlankContent } from '@/services/regby/protocol';

const COPIED_FEEDBACK_MS = 2000;
const REDEEMED_SUBTITLE = 'Successfully redeemed! Contents displayed below.';
const SCANNED_SUBTITLE = "Scanned from the merchant's QR. Contents displayed below.";

interface CustomerContentScreenProps {
  content: string;
  /** Merchant pubkey for a redeemed code; null for a scanned QR. */
  from: string | null;
  onBack: () => void;
}

export function CustomerContentScreen({ content, from, onBack }: CustomerContentScreenProps) {
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const { text, hadHidden } = displayableContent(content);
  const empty = isBlankContent(text);

  useEffect(() => {
    if (copy !== 'copied') return;
    const id = setTimeout(() => setCopy('idle'), COPIED_FEEDBACK_MS);
    return () => clearTimeout(id);
  }, [copy]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <Page role="customer">
      <ScreenHeader role="customer" onBack={onBack} />
      <ScreenTitle title="Payment Content" subtitle={from === null ? SCANNED_SUBTITLE : REDEEMED_SUBTITLE} />

      <div className="content-box" data-empty={empty}>
        {empty ? 'The merchant shared no text.' : text}
      </div>
      {hadHidden && <p className="field-hint">Hidden characters were removed from the display. Copy keeps the original.</p>}
      {from !== null && <p className="peer">FROM {shortNpub(from)}</p>}

      <div className="spacer" />
      <div className="stack">
        <button type="button" className="btn" disabled={empty} onClick={() => void copyText()}>
          {copy === 'copied' ? <Check size={26} /> : <Copy size={26} />}
          {copy === 'copied' ? 'Copied' : 'Copy Text'}
        </button>
      </div>
      {copy === 'failed' && <p className="error">Could not copy. Select the text and copy it manually.</p>}
    </Page>
  );
}

/**
 * Customer step 2: the merchant's text, shown exactly as written (line breaks
 * and spacing kept) and as plain text only, since it came through an
 * untrusted broker. Copy hands over the original verbatim.
 */
import { Check, Copy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { shortNpub } from '@/lib/npub';
import type { RedeemedContent } from '@/services/regby/client';
import { displayableContent } from '@/services/regby/protocol';

const COPIED_FEEDBACK_MS = 2000;

interface CustomerContentScreenProps {
  redeemed: RedeemedContent;
  onBack: () => void;
}

export function CustomerContentScreen({ redeemed, onBack }: CustomerContentScreenProps) {
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle');
  const { text, hadHidden } = displayableContent(redeemed.content);
  const empty = text.trim() === '';

  useEffect(() => {
    if (copy !== 'copied') return;
    const id = setTimeout(() => setCopy('idle'), COPIED_FEEDBACK_MS);
    return () => clearTimeout(id);
  }, [copy]);

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(redeemed.content);
      setCopy('copied');
    } catch {
      setCopy('failed');
    }
  };

  return (
    <Page role="customer">
      <ScreenHeader role="customer" onBack={onBack} />
      <ScreenTitle title="Payment Content" subtitle="Successfully redeemed! Contents displayed below." />

      <div className="content-box" data-empty={empty}>
        {empty ? 'The merchant shared no text.' : text}
      </div>
      {hadHidden && <p className="field-hint">Hidden characters were removed from the display. Copy keeps the original.</p>}
      <p className="peer">From {shortNpub(redeemed.from)}</p>

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

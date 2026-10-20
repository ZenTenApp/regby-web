/** Merchant step 1: the text to share, then mint a code for it. */
import { ClipboardPaste, X } from 'lucide-react';
import { useState } from 'react';

import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { CLIPBOARD_BLOCKED_TEXT } from '@/lib/clipboard';
import { useAction } from '@/lib/use-action';
import { REGBY_ERROR_TEXT, regbyErrorText } from '@/services/regby/protocol';

interface MerchantComposeScreenProps {
  draft: string;
  onDraft: (text: string) => void;
  onGenerate: (content: string) => Promise<void>;
  onBack: () => void;
}

export function MerchantComposeScreen({ draft, onDraft, onGenerate, onBack }: MerchantComposeScreenProps) {
  const { run, busy, error, setError } = useAction(onGenerate, regbyErrorText);
  const [pasteError, setPasteError] = useState(false);
  const blank = draft.trim() === '';

  const paste = async () => {
    setPasteError(false);
    try {
      onDraft(draft + (await navigator.clipboard.readText()));
    } catch {
      setPasteError(true);
    }
  };

  return (
    <Page role="merchant">
      <ScreenHeader role="merchant" onBack={onBack} />
      <ScreenTitle
        title="Request a Payment"
        subtitle="Enter what you want to receive, then generate a one-time code that will expire in 1 minute."
      />

      <div className="field">
        <label htmlFor="content" className="visually-hidden">
          Content to share
        </label>
        <textarea
          id="content"
          value={draft}
          placeholder="Input text here..."
          disabled={busy}
          onChange={(event) => {
            onDraft(event.target.value);
            setError(null);
          }}
        />
        <div className="field-actions">
          {draft !== '' && (
            <button type="button" className="chip" disabled={busy} onClick={() => onDraft('')}>
              <X size={18} />
              Clear
            </button>
          )}
          <button type="button" className="chip" disabled={busy} onClick={() => void paste()}>
            <ClipboardPaste size={18} />
            Paste
          </button>
        </div>
      </div>
      {pasteError && <p className="field-hint">{CLIPBOARD_BLOCKED_TEXT}</p>}

      <div className="spacer" />
      <div className="stack">
        <button
          type="button"
          className="btn"
          disabled={busy || blank}
          onClick={() => void run(draft)}
        >
          {busy && <Spinner size={26} />}
          {busy ? 'Generating…' : 'Generate Code'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {!error && blank && draft !== '' && <p className="note">{REGBY_ERROR_TEXT.empty}</p>}
    </Page>
  );
}

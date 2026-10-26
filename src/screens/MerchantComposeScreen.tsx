/** Merchant step 1: the text to share, then mint a code for it. */
import { Clipboard, X } from 'lucide-react';
import { useState } from 'react';

import { Page, ScreenHeader } from '@/components/Layout';
import { Spinner } from '@/components/Spinner';
import { Switch } from '@/components/Switch';
import { ICON_SIZE } from '@/components/icon';
import { CLIPBOARD_BLOCKED_TEXT, readClipboard } from '@/lib/clipboard';
import { useAction } from '@/lib/use-action';
import { regbyErrorText } from '@/services/regby/protocol';

/** A client-side cap that keeps the text comfortably inside one QR. */
const MAX_CHARS = 2048;

interface MerchantComposeScreenProps {
  draft: string;
  onDraft: (text: string) => void;
  showQr: boolean;
  onShowQr: (show: boolean) => void;
  onGenerate: (content: string) => Promise<void>;
  onBack: () => void;
}

export function MerchantComposeScreen({ draft, onDraft, showQr, onShowQr, onGenerate, onBack }: MerchantComposeScreenProps) {
  const { run, busy, error, setError } = useAction(onGenerate, regbyErrorText);
  const [pasteError, setPasteError] = useState(false);
  const full = draft.length >= MAX_CHARS;

  const paste = async () => {
    const text = await readClipboard();
    setPasteError(text === null);
    // A programmatic value skips the textarea's maxLength, so cap it here too.
    if (text !== null) onDraft((draft + text).slice(0, MAX_CHARS));
  };

  return (
    <Page role="merchant">
      <ScreenHeader role="merchant" onBack={onBack} />
      <p className="subtitle">
        Input text below for sharing or leave empty for pairing npubs exclusively. ({MAX_CHARS} maximum characters
        supported)
      </p>

      <div className="field">
        <label htmlFor="content" className="visually-hidden">
          Content to share
        </label>
        <textarea
          id="content"
          // The merchant came here to type; the text field is the whole task.
          autoFocus
          value={draft}
          maxLength={MAX_CHARS}
          aria-describedby="content-count"
          disabled={busy}
          onChange={(event) => {
            onDraft(event.target.value);
            setError(null);
          }}
        />
      </div>
      <div className="field-footer">
        <div id="content-count" className="field-count" data-full={full}>
          <span>
            {draft.length}/{MAX_CHARS}
          </span>
          {full && <span role="status">Limit reached, {MAX_CHARS} characters maximum.</span>}
        </div>
        {/* One action at a time: an empty field can only be pasted into, a filled one only cleared. */}
        {draft === '' ? (
          <button type="button" className="chip" disabled={busy} onClick={() => void paste()}>
            <Clipboard size={ICON_SIZE} />
            Paste
          </button>
        ) : (
          <button
            type="button"
            className="chip"
            disabled={busy}
            onClick={() => {
              onDraft('');
              setPasteError(false);
            }}
          >
            <X size={ICON_SIZE} />
            Clear
          </button>
        )}
      </div>
      {pasteError && <p className="field-hint">{CLIPBOARD_BLOCKED_TEXT}</p>}

      {/* Only QR is live; the broker code is always minted and GlueCodes is not built yet. */}
      <div className="output-options" role="group" aria-label="Share as">
        <Switch label="QR" checked={showQr} onChange={onShowQr} disabled={busy} />
        <Switch label="ReGBY" checked disabled />
        <Switch label="GlueCodes" checked={false} disabled />
      </div>

      <div className="spacer" />
      <div className="stack">
        <button
          type="button"
          className="btn"
          disabled={busy}
          onClick={() => void run(draft)}
        >
          {busy && <Spinner />}
          {busy ? 'Generating…' : 'Generate Code'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
    </Page>
  );
}

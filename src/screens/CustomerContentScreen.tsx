/**
 * Customer step 2: the merchant's text, shown exactly as written (line breaks
 * and spacing kept) and as plain text only, since it came through an
 * untrusted broker. Copy hands over the original verbatim.
 */
import { CodeDisplay } from '@/components/Code';
import { CopyButton } from '@/components/CopyButton';
import { Page, ScreenHeader } from '@/components/Layout';
import { npub, shortNpub } from '@/lib/npub';
import { displayableContent, isBlankContent } from '@/services/regby/protocol';

interface CustomerContentScreenProps {
  content: string;
  code: string;
  /** Merchant pubkey that answered the redeem. */
  from: string;
  onBack: () => void;
}

export function CustomerContentScreen({ content, code, from, onBack }: CustomerContentScreenProps) {
  const { text, hadHidden } = displayableContent(content);
  const empty = isBlankContent(text);

  return (
    <Page role="customer">
      <ScreenHeader role="customer" onBack={onBack} />

      <div className="content-box" data-empty={empty}>
        {empty ? 'The merchant shared no text.' : text}
      </div>
      <div className="field-footer">
        <p className="peer">
          From {shortNpub(from)}
          <CopyButton variant="icon" text={npub(from)} label="merchant npub" />
        </p>
        <CopyButton variant="chip" text={content} disabled={empty} />
      </div>
      {hadHidden && <p className="field-hint">Hidden characters were removed from the display. Copy keeps the original.</p>}

      {/* Same height as the redeem screen's code, so the boxes stay put across the redeem. */}
      <div className="code-after-content">
        <CodeDisplay code={code} />
      </div>
    </Page>
  );
}

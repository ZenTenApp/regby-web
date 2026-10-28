/**
 * Customer step 2: the merchant's text, shown exactly as written (line breaks
 * and spacing kept) and as plain text only, since it came through an
 * untrusted broker. Copy hands over the original verbatim.
 */
import { CodeDisplay } from '@/components/Code';
import { ContentPanel } from '@/components/ContentPanel';
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

      <ContentPanel
        head={
          <>
            <span className="content-panel-from">From: {shortNpub(from)}</span>
            <CopyButton variant="icon" text={npub(from)} label="merchant npub" />
          </>
        }
        foot={
          empty ? (
            <p className="content-panel-note">No content provided. Intended only for pairing npubs.</p>
          ) : (
            <CopyButton variant="text" text={content} label="content" />
          )
        }
      >
        {!empty && text}
      </ContentPanel>
      {hadHidden && <p className="field-hint">Hidden characters were removed from the display. Copy keeps the original.</p>}

      {/* Same place as the redeem screen's code, so the boxes stay put across the redeem. */}
      <div className="code-after-content">
        <CodeDisplay code={code} />
      </div>
    </Page>
  );
}

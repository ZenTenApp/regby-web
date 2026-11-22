/**
 * Log in with an encrypted OpenSSH Ed25519 key, in four steps: the key, its
 * passphrase, the subaccount shown as the Wallet Label, then the optional
 * Card Label. Same derivation as chat and usdt-pay, so the same key is the
 * same npub everywhere. The subaccount is required and opens the identity
 * `meltify -s <name>` derives from the key, as in chat. A card label opens
 * that wallet's Card (its BIP39 passphrase, as in zentenpay); Skip leaves it
 * empty and logs in as the wallet itself.
 *
 * The key is never shown: Paste reads it from the clipboard (then clears the
 * clipboard) and Upload from a file, into a ref. The passphrase and both
 * labels live only in their DOM nodes. All are read at submit time; React
 * state holds just whether each field is filled. Every step stays mounted
 * (the inactive ones `hidden`) so the typed values survive moving between steps.
 */
import { Info, Paperclip } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react';

import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { MaskedInput } from '@/components/MaskedInput';
import { Spinner } from '@/components/Spinner';
import { ICON_SIZE } from '@/components/icon';
import type { Role } from '@/components/roles';
import { clearClipboard, readClipboard } from '@/lib/clipboard';
import { KEY_ERROR_TEXT, keyErrorCode } from '@/lib/errors';
import type { Signer } from '@/services/keys/signer';
import {
  cancelSshLogin,
  estimateSshLoginSeconds,
  inspectSshKey,
  loginWithSsh,
  normalizeCardLabel,
  prepareSshLogin,
} from '@/services/keys/ssh-login';

/** An Ed25519 key file is well under 1 KiB; anything this big is the wrong file. */
const KEY_FILE_MAX_BYTES = 64 * 1024;

/** Below this the estimate is noise; the spinner alone reads as responsive. */
const ESTIMATE_FLOOR_SECONDS = 3;

/** With no key field to paste into, the file is the only other way in. */
const PASTE_BLOCKED_TEXT = 'Clipboard access was blocked. Upload the key file instead.';

/** The key stays readable by the next paste, so the user has to overwrite it. */
const CLIPBOARD_NOT_CLEARED_TEXT = 'Could not clear the clipboard. Copy something else over your key.';

function formatEstimate(seconds: number): string {
  return seconds >= 60 ? `~${Math.ceil(seconds / 60)} min` : `~${Math.round(seconds)}s`;
}

/** In order: Back walks this list backwards. */
const STEPS = ['key', 'passphrase', 'subaccount', 'card'] as const;
type Step = (typeof STEPS)[number];

interface SshKeyScreenProps {
  role: Role;
  onBack: () => void;
  onSigner: (signer: Signer) => void;
}

/** Forgets the key and empties the secret fields, on success and on the way
 *  out; the strings themselves cannot be wiped. */
function dropSecrets(pem: RefObject<string>, ...fields: (HTMLInputElement | null)[]): void {
  pem.current = '';
  for (const field of fields) if (field) field.value = '';
}

interface FieldStepProps {
  id: string;
  shown: boolean;
  title: string;
  subtitle: string;
  /** Screen-reader name of the field; the title says it visually. */
  label: string;
  placeholder: string;
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  /** Red warning under the field, as the Figma's label steps carry. */
  hint?: string;
  /** The typed value, for the caller to keep only whether it is filled. */
  onValue: (value: string) => void;
  /** The step's submit button, at the card's foot. */
  children: ReactNode;
}

/** One masked field per step (passphrase, Wallet Label, Card Label), titled,
 *  with its action pinned to the card's foot. */
function FieldStep({
  id,
  shown,
  title,
  subtitle,
  label,
  placeholder,
  inputRef,
  disabled = false,
  hint,
  onValue,
  children,
}: FieldStepProps) {
  return (
    <div className="card-fill" hidden={!shown}>
      <ScreenTitle title={title} subtitle={subtitle} centered />
      <label htmlFor={id} className="visually-hidden">
        {label}
      </label>
      <MaskedInput
        id={id}
        ref={inputRef}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        onChange={(event) => onValue(event.target.value)}
      />
      {hint && (
        <p className="field-hint" data-tone="danger">
          <Info size={ICON_SIZE} />
          {hint}
        </p>
      )}
      <div className="spacer" />
      <div className="stack">{children}</div>
    </div>
  );
}

export function SshKeyScreen({ role, onBack, onSigner }: SshKeyScreenProps) {
  const pemRef = useRef('');
  const passRef = useRef<HTMLInputElement>(null);
  const subaccountRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('key');
  const [hasPass, setHasPass] = useState(false);
  const [hasSubaccount, setHasSubaccount] = useState(false);
  const [hasCard, setHasCard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    prepareSshLogin();
    // Captured now: the refs are detached by the time the cleanup runs.
    const fields = [passRef.current, subaccountRef.current, cardRef.current];
    return () => {
      cancelSshLogin();
      dropSecrets(pemRef, ...fields);
    };
  }, []);

  // Focus follows a step change once the new step is shown; a `hidden` field
  // cannot take focus inside the handler that switches.
  const focusStep = useRef(false);
  useEffect(() => {
    if (!focusStep.current) return;
    focusStep.current = false;
    // The key step has no field; its Paste button is the first thing to reach.
    const stepField: Partial<Record<Step, RefObject<HTMLElement | null>>> = {
      passphrase: passRef,
      subaccount: subaccountRef,
      card: cardRef,
    };
    stepField[step]?.current?.focus();
  }, [step]);

  const goTo = (next: Step) => {
    focusStep.current = true;
    setError(null);
    setStep(next);
  };

  /** Checks the key's shape before asking for its passphrase, so a wrong
   *  paste or file fails on the step that can fix it. Returns whether it moved on. */
  const loadPem = (pem: string): boolean => {
    try {
      inspectSshKey(pem);
    } catch (err) {
      setError(KEY_ERROR_TEXT[keyErrorCode(err)]);
      return false;
    }
    pemRef.current = pem;
    goTo('passphrase');
    return true;
  };

  const pasteKey = async () => {
    const pasted = await readClipboard();
    if (pasted === null) {
      setError(PASTE_BLOCKED_TEXT);
      return;
    }
    // Left in place, the key would go out with the next paste anywhere else.
    // Cleared even when it fails the check below: it was offered as the key.
    const cleared = await clearClipboard();
    // Set after loadPem's goTo, which clears the error, so it shows on the passphrase step.
    if (loadPem(pasted) && !cleared) setError(CLIPBOARD_NOT_CLEARED_TEXT);
  };

  const loadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires `change`.
    event.target.value = '';
    if (!file) return;
    if (file.size > KEY_FILE_MAX_BYTES) {
      setError('That file is too large to be an SSH private key.');
      return;
    }
    file.text().then(loadPem, () => setError('Could not read that file.'));
  };

  const back = () => {
    const previous = STEPS[STEPS.indexOf(step) - 1];
    if (previous) goTo(previous);
    else onBack();
  };

  /** Whether a step may move on. The key step moves on by Paste or Upload,
   *  never by submit; the Card Label is optional. */
  const ready: Record<Step, boolean> = { key: false, passphrase: hasPass, subaccount: hasSubaccount, card: true };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // Checked here, not only via `disabled`: Enter submits through the form's first
    // submit button, a hidden step's, so the button state is bypassed.
    if (!ready[step] || busy) return;
    // Every step but the last only moves on; the key is unlocked on the last.
    const next = STEPS[STEPS.indexOf(step) + 1];
    if (next) {
      goTo(next);
      return;
    }
    const pem = pemRef.current;
    const passphrase = passRef.current?.value ?? '';
    // Not trimmed: meltify hashes the name byte for byte, and a trimmed one
    // would quietly open a different identity than `meltify -s` prints.
    const subaccount = subaccountRef.current?.value ?? '';
    // `loginWithSsh` trims it; empty there is Skip, the wallet itself.
    const cardLabel = cardRef.current?.value ?? '';
    setError(null);

    let rounds: number;
    try {
      rounds = inspectSshKey(pem);
    } catch (err) {
      setError(KEY_ERROR_TEXT[keyErrorCode(err)]);
      return;
    }

    setBusy(true);
    estimateSshLoginSeconds(rounds).then(
      (seconds) => setEstimate(seconds >= ESTIMATE_FLOOR_SECONDS ? formatEstimate(seconds) : null),
      () => undefined,
    );
    try {
      const signer = await loginWithSsh({ pem, passphrase, subaccount, cardLabel });
      dropSecrets(pemRef, passRef.current, subaccountRef.current, cardRef.current);
      onSigner(signer);
    } catch (err) {
      const code = keyErrorCode(err);
      // The passphrase is only tried here, so send the user back to the step that fixes it.
      if (code === 'wrong-passphrase') goTo('passphrase');
      setError(KEY_ERROR_TEXT[code]);
      setBusy(false);
      setEstimate(null);
    }
  };

  return (
    <Page role={role}>
      <ScreenHeader role={role} onBack={back} backDisabled={busy} />

      {/* Any edit to a field drops the error it may have caused. */}
      <form className="card-fill" onSubmit={(event) => void submit(event)} onInput={() => setError(null)}>
        <div className="card-fill" hidden={step !== 'key'}>
          <ScreenTitle title="Input SSH Key" subtitle="Paste your Ed25519 Private Key" centered />
          {/* Key files usually have no extension, so no `accept` filter. */}
          <input ref={fileRef} type="file" hidden onChange={loadFile} />
          <div className="spacer" />
          <div className="stack">
            <button type="button" className="btn" onClick={() => void pasteKey()}>
              Paste
            </button>
            <p className="divider">or</p>
            <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>
              <Paperclip size={ICON_SIZE} />
              Upload
            </button>
          </div>
        </div>

        <FieldStep
          id="passphrase"
          shown={step === 'passphrase'}
          title="Enter Passphrase"
          subtitle="Enter your SSH Key Passphrase"
          label="Passphrase"
          placeholder="Enter Passphrase..."
          inputRef={passRef}
          onValue={(value) => setHasPass(value !== '')}
        >
          <button type="submit" className="btn" disabled={!hasPass}>
            Continue to Cards
          </button>
        </FieldStep>

        <FieldStep
          id="subaccount"
          shown={step === 'subaccount'}
          title="Enter Wallet Label"
          subtitle="Wallet Labels are Case Sensitive"
          label="Wallet Label"
          placeholder="Wallet Label..."
          inputRef={subaccountRef}
          hint="Wallet Label is Case Sensitive. A new input will create a new Card."
          onValue={(value) => setHasSubaccount(value !== '')}
        >
          <button type="submit" className="btn" disabled={!hasSubaccount}>
            Continue
          </button>
        </FieldStep>

        <FieldStep
          id="card"
          shown={step === 'card'}
          title="Enter Card Label"
          subtitle="Card Labels are Case Sensitive"
          label="Card Label"
          placeholder="Card Label..."
          inputRef={cardRef}
          disabled={busy}
          hint="Card Label is Case Sensitive. A new input will create a new Card."
          onValue={(value) => setHasCard(normalizeCardLabel(value) !== '')}
        >
          <button type="submit" className="btn" disabled={busy}>
            {busy && <Spinner />}
            {busy ? 'Unlocking…' : hasCard ? 'Continue' : 'Skip'}
          </button>
        </FieldStep>

        {busy && <p className="note">Decrypting your key{estimate ? `, ${estimate}` : ''}. Keep this tab open.</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </Page>
  );
}

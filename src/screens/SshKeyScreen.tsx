/**
 * Log in with an encrypted OpenSSH Ed25519 key, in three steps: the key, its
 * passphrase, then the subaccount, shown as the Card Label. Same derivation as
 * chat and usdt-pay, so the same key is the same npub everywhere. The
 * subaccount is required and opens the identity `meltify -s <name>` derives
 * from the key, as in chat.
 *
 * The key is never shown: Paste reads it from the clipboard (then clears the
 * clipboard) and Upload from a file, into a ref. The passphrase and subaccount
 * live only in their DOM nodes. All three are read at submit time; React state
 * holds just whether the passphrase and subaccount are filled. Every step stays
 * mounted (the inactive ones `hidden`) so the typed values survive moving between steps.
 */
import { Info } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type RefObject } from 'react';

import FileAttachmentIcon from '@/assets/icons/file-attachment.svg?react';
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
const STEPS = ['key', 'passphrase', 'subaccount'] as const;
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

export function SshKeyScreen({ role, onBack, onSigner }: SshKeyScreenProps) {
  const pemRef = useRef('');
  const passRef = useRef<HTMLInputElement>(null);
  const subaccountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('key');
  const [hasPass, setHasPass] = useState(false);
  const [hasSubaccount, setHasSubaccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    prepareSshLogin();
    // Captured now: the refs are detached by the time the cleanup runs.
    const fields = [passRef.current, subaccountRef.current];
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    // Enter or Continue on the passphrase step only moves on; the key is unlocked on the last step.
    if (step === 'passphrase') {
      if (hasPass) goTo('subaccount');
      return;
    }
    // Checked here, not only via `disabled`: Enter submits through the form's first
    // submit button, the hidden passphrase one, so the button state is bypassed.
    if (step !== 'subaccount' || !hasSubaccount || busy) return;
    const pem = pemRef.current;
    const passphrase = passRef.current?.value ?? '';
    // Not trimmed: meltify hashes the name byte for byte, and a trimmed one
    // would quietly open a different identity than `meltify -s` prints.
    const subaccount = subaccountRef.current?.value ?? '';
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
      const signer = await loginWithSsh(pem, passphrase, subaccount);
      dropSecrets(pemRef, passRef.current, subaccountRef.current);
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

      <form className="card-fill" onSubmit={(event) => void submit(event)}>
        <div className="card-fill" hidden={step !== 'key'}>
          <ScreenTitle title="Input SSH Key" subtitle="Paste your Ed25519 Private Key" centered />
          {/* Key files usually have no extension, so no `accept` filter. */}
          <input ref={fileRef} type="file" hidden onChange={loadFile} />
          <div className="spacer" />
          <div className="stack">
            <button type="button" className="btn btn-sm" onClick={() => void pasteKey()}>
              Paste SSH Key
            </button>
            <button type="button" className="text-button text-button-lg" onClick={() => fileRef.current?.click()}>
              <FileAttachmentIcon width={ICON_SIZE} height={ICON_SIZE} />
              Upload File
            </button>
          </div>
        </div>

        <div className="card-fill" hidden={step !== 'passphrase'}>
          <ScreenTitle title="Enter Passphrase" subtitle="Enter your SSH Key Passphrase" centered />
          <label htmlFor="passphrase" className="visually-hidden">
            Passphrase
          </label>
          <MaskedInput
            id="passphrase"
            ref={passRef}
            placeholder="Enter Passphrase..."
            autoComplete="off"
            onChange={(event) => {
              setHasPass(event.target.value !== '');
              setError(null);
            }}
          />
          <div className="spacer" />
          <div className="stack">
            <button type="submit" className="btn" disabled={!hasPass}>
              Continue to Cards
            </button>
          </div>
        </div>

        <div className="card-fill" hidden={step !== 'subaccount'}>
          <ScreenTitle title="Enter Card Label" subtitle="Card Labels are Case Sensitive" centered />
          <label htmlFor="subaccount" className="visually-hidden">
            Card Label
          </label>
          <MaskedInput
            id="subaccount"
            ref={subaccountRef}
            placeholder="Card Label..."
            autoComplete="off"
            disabled={busy}
            onChange={(event) => {
              setHasSubaccount(event.target.value !== '');
              setError(null);
            }}
          />
          <p className="field-hint" data-tone="danger">
            <Info size={ICON_SIZE} />
            Card Label is Case Sensitive. A new input will create a new Card.
          </p>
          <div className="spacer" />
          <div className="stack">
            <button type="submit" className="btn" disabled={busy || !hasSubaccount}>
              {busy && <Spinner />}
              {busy ? 'Unlocking…' : 'Continue'}
            </button>
          </div>
        </div>

        {busy && <p className="note">Decrypting your key{estimate ? `, ${estimate}` : ''}. Keep this tab open.</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </Page>
  );
}

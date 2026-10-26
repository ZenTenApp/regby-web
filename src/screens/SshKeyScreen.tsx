/**
 * Log in with an encrypted OpenSSH Ed25519 key, in two steps: the key, then
 * its passphrase. Same derivation as chat and usdt-pay, so the same key is the
 * same npub everywhere. The subaccount name is required and opens the
 * identity `meltify -s <name>` derives from the key, as in chat.
 *
 * The PEM, passphrase and subaccount live only in the DOM nodes and are read
 * at submit time; React state holds just whether each required field is
 * filled. Both steps stay mounted (the inactive one `hidden`) so the key
 * survives moving to the passphrase and back.
 */
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import FileAttachmentIcon from '@/assets/icons/file-attachment.svg?react';
import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { MaskedInput } from '@/components/MaskedInput';
import { Spinner } from '@/components/Spinner';
import { ICON_SIZE } from '@/components/icon';
import type { Role } from '@/components/roles';
import { CLIPBOARD_BLOCKED_TEXT, readClipboard } from '@/lib/clipboard';
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

function formatEstimate(seconds: number): string {
  return seconds >= 60 ? `~${Math.ceil(seconds / 60)} min` : `~${Math.round(seconds)}s`;
}

type Step = 'key' | 'passphrase';

interface SshKeyScreenProps {
  role: Role;
  onBack: () => void;
  onSigner: (signer: Signer) => void;
}

function clearFields(...fields: (HTMLInputElement | HTMLTextAreaElement | null)[]): void {
  for (const field of fields) if (field) field.value = '';
}

export function SshKeyScreen({ role, onBack, onSigner }: SshKeyScreenProps) {
  const pemRef = useRef<HTMLTextAreaElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const subaccountRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('key');
  const [hasPem, setHasPem] = useState(false);
  const [hasPass, setHasPass] = useState(false);
  const [hasSubaccount, setHasSubaccount] = useState(false);
  const [busy, setBusy] = useState(false);
  const [estimate, setEstimate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    prepareSshLogin();
    const fields = [pemRef.current, passRef.current, subaccountRef.current];
    // Clear the secrets on the way out; the strings themselves cannot be wiped.
    return () => {
      cancelSshLogin();
      clearFields(...fields);
    };
  }, []);

  // Focus follows a step change once the new step is shown; a `hidden` field
  // cannot take focus inside the handler that switches.
  const focusStep = useRef(false);
  useEffect(() => {
    if (!focusStep.current) return;
    focusStep.current = false;
    (step === 'key' ? pemRef : passRef).current?.focus();
  }, [step]);

  const goTo = (next: Step) => {
    focusStep.current = true;
    setError(null);
    setStep(next);
  };

  const setPem = (value: string) => {
    if (pemRef.current) pemRef.current.value = value;
    setHasPem(value.trim() !== '');
    setError(null);
  };

  /** Checks the key's shape before asking for its passphrase, so a wrong
   *  paste or file fails on the step that can fix it. */
  const advance = (pem: string) => {
    try {
      inspectSshKey(pem);
    } catch (err) {
      setError(KEY_ERROR_TEXT[keyErrorCode(err)]);
      return;
    }
    goTo('passphrase');
  };

  /** A whole key arriving at once (Paste or file) needs no Continue tap;
   *  typing in the key field does. */
  const loadPem = (value: string) => {
    setPem(value);
    if (value.trim() !== '') advance(value);
  };

  const pasteKey = async () => {
    const pasted = await readClipboard();
    if (pasted === null) setError(CLIPBOARD_BLOCKED_TEXT);
    else loadPem(pasted);
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
    if (step === 'key') {
      onBack();
      return;
    }
    goTo('key');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (step !== 'passphrase') return;
    const pem = pemRef.current?.value ?? '';
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
      clearFields(pemRef.current, passRef.current, subaccountRef.current);
      onSigner(signer);
    } catch (err) {
      setError(KEY_ERROR_TEXT[keyErrorCode(err)]);
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
          <div className="field ssh-key-field">
            <label htmlFor="pem" className="visually-hidden">
              SSH private key
            </label>
            <textarea
              id="pem"
              ref={pemRef}
              placeholder="Enter your SSH Key..."
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(event) => setPem(event.target.value)}
            />
            <div className="field-actions">
              <button type="button" className="chip" onClick={() => fileRef.current?.click()}>
                <FileAttachmentIcon width={ICON_SIZE} height={ICON_SIZE} />
                Upload
              </button>
            </div>
            {/* Key files usually have no extension, so no `accept` filter. */}
            <input ref={fileRef} type="file" hidden onChange={loadFile} />
          </div>
          <div className="spacer" />
          <div className="stack">
            {hasPem ? (
              <button type="button" className="btn" onClick={() => advance(pemRef.current?.value ?? '')}>
                Continue
              </button>
            ) : (
              <button type="button" className="btn" onClick={() => void pasteKey()}>
                Paste SSH Key
              </button>
            )}
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
            disabled={busy}
            onChange={(event) => {
              setHasPass(event.target.value !== '');
              setError(null);
            }}
          />

          <div className="field-gap">
            <label htmlFor="subaccount" className="visually-hidden">
              Subaccount
            </label>
            <MaskedInput
              id="subaccount"
              ref={subaccountRef}
              placeholder="Subaccount"
              autoComplete="off"
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              disabled={busy}
              onChange={(event) => {
                setHasSubaccount(event.target.value !== '');
                setError(null);
              }}
            />
          </div>

          <div className="spacer" />
          <div className="stack">
            <button type="submit" className="btn" disabled={busy || !hasPass || !hasSubaccount}>
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

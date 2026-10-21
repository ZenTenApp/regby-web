/**
 * Log in with an encrypted OpenSSH Ed25519 key, pasted or loaded from a file,
 * plus its passphrase. Same derivation as chat and usdt-pay, so the same key
 * is the same npub everywhere. An optional subaccount name opens the identity
 * `meltify -s <name>` derives from the key instead, as in chat.
 *
 * The PEM, passphrase and subaccount live only in the DOM nodes and are read
 * at submit time; React state holds just whether each required field is filled.
 */
import { ClipboardPaste, FileKey } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';

import { Page, ScreenHeader, ScreenTitle } from '@/components/Layout';
import { MaskedInput } from '@/components/MaskedInput';
import { Spinner } from '@/components/Spinner';
import { ICON_SIZE } from '@/components/icon';
import type { Role } from '@/components/roles';
import { CLIPBOARD_BLOCKED_TEXT } from '@/lib/clipboard';
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
  const [hasPem, setHasPem] = useState(false);
  const [hasPass, setHasPass] = useState(false);
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

  const setPem = (value: string) => {
    if (pemRef.current) pemRef.current.value = value;
    setHasPem(value.trim() !== '');
    setError(null);
  };

  /** A whole key arriving at once (file or Paste button) leaves only the
   *  passphrase to fill, so move there. Typing in the key field does not. */
  const loadPem = (value: string) => {
    setPem(value);
    if (value.trim() !== '') passRef.current?.focus();
  };

  const pasteKey = async () => {
    try {
      loadPem(await navigator.clipboard.readText());
    } catch {
      setError(CLIPBOARD_BLOCKED_TEXT);
    }
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

  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
      <ScreenHeader role={role} onBack={onBack} />
      <ScreenTitle
        title="Login with SSH Key"
        subtitle="Paste your passphrase-protected Ed25519 OpenSSH private key, or choose the key file (usually ~/.ssh/id_ed25519)."
      />

      <form onSubmit={(event) => void submit(event)}>
        <div className="field">
          <label htmlFor="pem" className="visually-hidden">
            SSH private key
          </label>
          <textarea
            id="pem"
            ref={pemRef}
            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            disabled={busy}
            onChange={(event) => setPem(event.target.value)}
          />
          <div className="field-actions">
            <button type="button" className="chip" disabled={busy} onClick={() => fileRef.current?.click()}>
              <FileKey size={ICON_SIZE} />
              Choose file
            </button>
            <button type="button" className="chip" disabled={busy} onClick={() => void pasteKey()}>
              <ClipboardPaste size={ICON_SIZE} />
              Paste
            </button>
          </div>
          {/* Key files usually have no extension, so no `accept` filter. */}
          <input ref={fileRef} type="file" hidden onChange={loadFile} />
        </div>

        <div className="field-gap">
          <label htmlFor="passphrase" className="visually-hidden">
            Passphrase
          </label>
          <input
            id="passphrase"
            ref={passRef}
            className="input"
            type="password"
            placeholder="Key passphrase"
            autoComplete="off"
            disabled={busy}
            onChange={(event) => {
              setHasPass(event.target.value !== '');
              setError(null);
            }}
          />
        </div>

        <div className="field-gap">
          <label htmlFor="subaccount" className="visually-hidden">
            Subaccount
          </label>
          <MaskedInput
            id="subaccount"
            ref={subaccountRef}
            placeholder="Subaccount (optional)"
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-describedby="subaccount-hint"
            disabled={busy}
          />
          <p id="subaccount-hint" className="field-hint">
            Same as <code>meltify -s &lt;name&gt;</code>: a separate identity from this key. Leave empty to sign in as
            the key itself.
          </p>
        </div>

        <div className="spacer" />
        <div className="stack">
          <button type="submit" className="btn" disabled={busy || !hasPem || !hasPass}>
            {busy && <Spinner />}
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </div>
        {busy && <p className="note">Decrypting your key{estimate ? `, ${estimate}` : ''}. Keep this tab open.</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </Page>
  );
}

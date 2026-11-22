/**
 * SSH login orchestration. Key inspection runs on the main thread (base64 and
 * framing, microseconds) so a bad or unencrypted key is refused before any
 * passphrase prompt; the bcrypt unlock runs in the key worker, which is
 * terminated afterwards to drop the cloned PEM and passphrase.
 */
import { parseEncryptedOpenSSHKey } from '@/services/ssh/openssh';
import { keyWorker } from '@/services/worker/client';
import type { KeyWorkerRequestMap } from '@/services/worker/protocol';

import { localSigner, type Signer } from './signer';

/**
 * The card label as it enters BIP39, as zentenpay's `normaliseCardLabel`:
 * only surrounding whitespace is dropped, so a phone keyboard's trailing
 * space cannot open a different, empty Card. Empty means no Card. Here, not
 * beside the derivation in `nip06`, so the main bundle skips the wordlist.
 */
export function normalizeCardLabel(raw: string): string {
  return raw.trim();
}

/** bcrypt rounds of a pasted key, or a `KeyError`. */
export function inspectSshKey(pem: string): number {
  return parseEncryptedOpenSSHKey(pem).kdfRounds;
}

export function prepareSshLogin(): void {
  keyWorker.warmup();
}

export function estimateSshLoginSeconds(rounds: number): Promise<number> {
  return keyWorker.request('estimate', { rounds }).then((result) => result.seconds);
}

/** Named rather than positional: the two labels are both plain strings, and
 *  swapping them would open a different identity without any error. */
export type SshLogin = KeyWorkerRequestMap['ssh-login'];

/** The Wallet Label (`subaccount`) goes as typed, since meltify hashes it byte
 *  for byte; the Card Label is normalised here, empty for no Card. */
export async function loginWithSsh({ pem, passphrase, subaccount, cardLabel }: SshLogin): Promise<Signer> {
  try {
    const { secretKey } = await keyWorker.request('ssh-login', {
      pem,
      passphrase,
      subaccount,
      cardLabel: normalizeCardLabel(cardLabel),
    });
    return localSigner(secretKey);
  } finally {
    keyWorker.terminate();
  }
}

export function cancelSshLogin(): void {
  keyWorker.terminate();
}

/**
 * SSH login orchestration. Key inspection runs on the main thread (base64 and
 * framing, microseconds) so a bad or unencrypted key is refused before any
 * passphrase prompt; the bcrypt unlock runs in the key worker, which is
 * terminated afterwards to drop the cloned PEM and passphrase.
 */
import { parseEncryptedOpenSSHKey } from '@/services/ssh/openssh';
import { keyWorker } from '@/services/worker/client';

import { localSigner, type Signer } from './signer';

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

export async function loginWithSsh(pem: string, passphrase: string, subaccount: string): Promise<Signer> {
  try {
    const { secretKey } = await keyWorker.request('ssh-login', { pem, passphrase, subaccount });
    return localSigner(secretKey);
  } finally {
    keyWorker.terminate();
  }
}

export function cancelSshLogin(): void {
  keyWorker.terminate();
}

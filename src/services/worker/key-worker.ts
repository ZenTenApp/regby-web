/**
 * The key worker: runs the SSH unlock off the main thread. The PEM and
 * passphrase are immutable strings cloned into this heap, which no `fill(0)`
 * reaches, so the client terminates the worker after every login.
 */
import { wipe } from '@/lib/bytes';
import { errorMessage, keyErrorCode } from '@/lib/errors';
import { nostrKeyFromSshSeed } from '@/services/keys/nip06';
import { deriveSubaccountSeed } from '@/services/keys/subaccount';
import { convertOpenSSHEd25519, estimateDecryptSeconds } from '@/services/ssh';

import type { KeyWorkerRequest, KeyWorkerResponse } from './protocol';

const scope = self as unknown as DedicatedWorkerGlobalScope;

/** Empty `subaccount` means the key itself, as in chat. */
function sshSecretKey(pem: string, passphrase: string, subaccount: string): Uint8Array {
  const seed = convertOpenSSHEd25519(pem, passphrase);
  let root = seed;
  try {
    if (subaccount !== '') root = deriveSubaccountSeed(seed, subaccount);
    return nostrKeyFromSshSeed(root);
  } finally {
    wipe(seed, root);
  }
}

function handle(request: KeyWorkerRequest): KeyWorkerResponse {
  switch (request.kind) {
    case 'warmup':
      return { id: request.id, ok: true, kind: 'warmup', result: {} };
    case 'estimate':
      return {
        id: request.id,
        ok: true,
        kind: 'estimate',
        result: { seconds: estimateDecryptSeconds(request.rounds) },
      };
    case 'ssh-login':
      return {
        id: request.id,
        ok: true,
        kind: 'ssh-login',
        result: { secretKey: sshSecretKey(request.pem, request.passphrase, request.subaccount) },
      };
  }
}

scope.onmessage = (event: MessageEvent<KeyWorkerRequest>) => {
  const request = event.data;
  let response: KeyWorkerResponse;
  try {
    response = handle(request);
  } catch (err) {
    response = { id: request.id, ok: false, code: keyErrorCode(err), message: errorMessage(err) };
  }
  const transfer = response.ok && response.kind === 'ssh-login' ? [response.result.secretKey.buffer] : [];
  scope.postMessage(response, { transfer });
};

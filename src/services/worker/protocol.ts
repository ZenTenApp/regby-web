/**
 * Key-worker message contract. Everything expensive here is `bcrypt_pbkdf`
 * at an SSH key's round count, one uninterruptible synchronous call that
 * would freeze the page on the main thread. Failures travel as a typed
 * {@link KeyErrorCode} so they survive structured cloning.
 */
import type { KeyErrorCode } from '@/lib/errors';

export interface KeyWorkerRequestMap {
  /** Evaluate the module so `estimate` does not time a cold start. */
  warmup: Record<string, never>;
  /** Benchmark bcrypt and project the wait for `rounds`. */
  estimate: { rounds: number };
  /** Decrypt an OpenSSH key and derive the Nostr key it roots. */
  'ssh-login': { pem: string; passphrase: string };
}

export interface KeyWorkerResultMap {
  warmup: Record<string, never>;
  estimate: { seconds: number };
  /** `secretKey`'s buffer is transferred, never cloned. */
  'ssh-login': { secretKey: Uint8Array };
}

export type KeyWorkerKind = keyof KeyWorkerRequestMap;

export type KeyWorkerRequest = {
  [K in KeyWorkerKind]: { id: number; kind: K } & KeyWorkerRequestMap[K];
}[KeyWorkerKind];

export type KeyWorkerResponse =
  | {
      [K in KeyWorkerKind]: { id: number; ok: true; kind: K; result: KeyWorkerResultMap[K] };
    }[KeyWorkerKind]
  | { id: number; ok: false; code: KeyErrorCode; message: string };

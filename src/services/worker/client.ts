/**
 * Main-thread handle on the key worker. Created lazily and torn down after
 * every login: `terminate` is the only way to cancel a running bcrypt and the
 * only way to reclaim the PEM and passphrase strings cloned into its heap.
 * Ported from `chat/src/services/worker/client.ts`.
 */
import { KeyError, errorMessage } from '@/lib/errors';

import type {
  KeyWorkerKind,
  KeyWorkerRequestMap,
  KeyWorkerResponse,
  KeyWorkerResultMap,
} from './protocol';

interface Pending {
  kind: KeyWorkerKind;
  resolve: (value: never) => void;
  reject: (reason: unknown) => void;
}

class KeyWorkerClient {
  #worker: Worker | null = null;
  #nextId = 1;
  readonly #pending = new Map<number, Pending>();

  #ensureWorker(): Worker {
    if (this.#worker) return this.#worker;
    const worker = new Worker(new URL('./key-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<KeyWorkerResponse>) => this.#settle(event.data);
    worker.onerror = (event) => this.#failAll(new Error(event.message || 'Key worker crashed'));
    this.#worker = worker;
    return worker;
  }

  #settle(response: KeyWorkerResponse): void {
    const pending = this.#pending.get(response.id);
    if (!pending) return;
    this.#pending.delete(response.id);
    if (!response.ok) {
      pending.reject(new KeyError(response.code, response.message));
      return;
    }
    // The cast below erases the kind-to-result link; check it first.
    if (response.kind !== pending.kind) {
      pending.reject(new KeyError('internal', `Worker answered ${response.kind} for ${pending.kind}`));
      return;
    }
    pending.resolve(response.result as never);
  }

  #failAll(reason: unknown): void {
    for (const pending of this.#pending.values()) pending.reject(reason);
    this.#pending.clear();
  }

  request<K extends KeyWorkerKind>(
    kind: K,
    payload: KeyWorkerRequestMap[K],
  ): Promise<KeyWorkerResultMap[K]> {
    const worker = this.#ensureWorker();
    const id = this.#nextId;
    this.#nextId += 1;
    return new Promise<KeyWorkerResultMap[K]>((resolve, reject) => {
      this.#pending.set(id, { kind, resolve: resolve as (value: never) => void, reject });
      try {
        worker.postMessage({ id, kind, ...payload });
      } catch (err) {
        this.#pending.delete(id);
        reject(new KeyError('internal', errorMessage(err)));
      }
    });
  }

  warmup(): void {
    void this.request('warmup', {}).catch(() => undefined);
  }

  terminate(): void {
    if (!this.#worker) return;
    this.#worker.terminate();
    this.#worker = null;
    this.#failAll(new KeyError('internal', 'Key worker was terminated'));
  }
}

export const keyWorker = new KeyWorkerClient();

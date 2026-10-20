/**
 * The ReGBY round-trip over the dedicated DM relays: encrypt to the broker,
 * publish a kind 4, and wait for the broker's reply linked back by `#e`.
 *
 * One client per signed-in session; it owns the relay sockets and closes
 * them on sign-out.
 */
import type { Event as NostrEvent, EventTemplate, VerifiedEvent } from 'nostr-tools/pure';
import { SimplePool } from 'nostr-tools/pool';

import {
  CLIENT_NAME,
  REGBY_DELIVERED_GRACE_MS,
  REGBY_EVENT_EXPIRY_SECONDS,
  REGBY_KIND,
  REGBY_MAX_WIRE_BYTES,
  REGBY_MIDDLEMAN_PUBKEY,
  REGBY_CODE_TTL_SECONDS,
  REGBY_RELAYS,
  REGBY_REQUEST_TIMEOUT_MS,
  RELAY_CONNECT_TIMEOUT_MS,
} from '@/config/regby';
import { utf8 } from '@/lib/bytes';
import { errorMessage } from '@/lib/errors';
import type { Signer } from '@/services/keys/signer';

import {
  DELIVERED_INTENT,
  FAILURE_INTENTS,
  REPLY_INTENT,
  RegbyError,
  assertMintable,
  isRegbyCode,
  normalizeRegbyCode,
  readPubkeyTag,
  readTag,
  type FailureIntent,
  type RequestIntent,
} from './protocol';

/** A code the broker minted, and when it stops working. */
export interface MintedCode {
  code: string;
  /** Epoch ms; the broker counts from the request's `created_at`, as we do. */
  expiresAt: number;
  /** Resolves with the customer's hex pubkey once the code is redeemed while
   *  still listened for; never settles otherwise. */
  delivered: Promise<string>;
  /** Stop listening for the redeemed notice. */
  stop: () => void;
}

export interface RedeemedContent {
  content: string;
  /** Hex pubkey of the merchant that minted the code. */
  from: string;
}

interface Reply {
  content: string;
  tags: string[][];
}

interface SentRequest {
  reply: Promise<Reply>;
  createdAt: number;
  close: () => void;
}

const AUTH_CHALLENGE_ATTEMPTS = 10;
const AUTH_CHALLENGE_POLL_MS = 100;
/** An extension signer can sit on an AUTH prompt forever; past this the relay
 *  is used unauthenticated rather than holding the whole request. */
const AUTH_TIMEOUT_MS = 15_000;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const nowSeconds = () => Math.floor(Date.now() / 1000);

function isFailureFor(request: RequestIntent, intent: string): intent is FailureIntent {
  return (FAILURE_INTENTS[request] as readonly string[]).includes(intent);
}

/** A promise plus its settle functions (`Promise.withResolvers` is newer than ES2022). */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A signer step (encrypt or sign) as a typed failure: an extension refusal
 *  or crash must not read as a broker problem. */
async function signerStep<T>(step: () => Promise<T>): Promise<T> {
  try {
    return await step();
  } catch {
    throw new RegbyError('signer');
  }
}

/** Resolve with `promise`, or reject with `timeout` after `ms`. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new RegbyError('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export class RegbyClient {
  readonly #signer: Signer;
  readonly #pool = new SimplePool();
  readonly #onauth: (template: EventTemplate) => Promise<VerifiedEvent>;

  constructor(signer: Signer) {
    this.#signer = signer;
    this.#onauth = (template) => signer.signEvent(template);
  }

  /** Mint a code for `content`. */
  async mint(content: string): Promise<MintedCode> {
    assertMintable(content);
    const delivered = deferred<string>();
    const request = await this.#send('request_regby_code', content, (event) => {
      if (readTag(event.tags, 'i') !== DELIVERED_INTENT) return;
      const customer = readPubkeyTag(event.tags, 'to');
      if (customer) delivered.resolve(customer);
    });

    try {
      const reply = await request.reply;
      if (!isRegbyCode(reply.content)) throw new RegbyError('malformed');
      const expiresAt = (request.createdAt + REGBY_CODE_TTL_SECONDS) * 1000;
      // Keep the subscription for the delivered notice, then let it go.
      const timer = setTimeout(request.close, expiresAt - Date.now() + REGBY_DELIVERED_GRACE_MS);
      const stop = () => {
        clearTimeout(timer);
        request.close();
      };
      return { code: reply.content, expiresAt, delivered: delivered.promise, stop };
    } catch (err) {
      request.close();
      throw err;
    }
  }

  /** Redeem a code for the merchant's content. */
  async redeem(input: string): Promise<RedeemedContent> {
    const code = normalizeRegbyCode(input);
    if (code === null) throw new RegbyError('regby_code_not_found');
    const request = await this.#send('request_regby_content', code);
    try {
      const reply = await request.reply;
      // A success always names the merchant; one without it broke protocol.
      const from = readPubkeyTag(reply.tags, 'from');
      if (from === null) throw new RegbyError('malformed');
      return { content: reply.content, from };
    } finally {
      request.close();
    }
  }

  close(): void {
    this.#pool.destroy();
  }

  /**
   * Publish one request and hand back its reply. The subscription opens
   * before the publish, filtered on the request id, so a fast reply cannot be
   * missed; a stored one is served on REQ anyway. `onNotice` sees every other
   * event the broker sends about this request.
   */
  async #send(
    intent: RequestIntent,
    plaintext: string,
    onNotice?: (event: NostrEvent) => void,
  ): Promise<SentRequest> {
    const relays = await this.#readyRelays();
    const createdAt = nowSeconds();
    const peer = REGBY_MIDDLEMAN_PUBKEY;

    // Empty content is never encrypted, in either direction.
    const content = plaintext === '' ? '' : await signerStep(() => this.#signer.encrypt(peer, plaintext));
    if (utf8(content).length > REGBY_MAX_WIRE_BYTES) throw new RegbyError('too-long');

    const event = await signerStep(() =>
      this.#signer.signEvent({
        kind: REGBY_KIND,
        created_at: createdAt,
        content,
        tags: [
          ['p', peer],
          ['i', intent],
          ['expiration', String(createdAt + REGBY_EVENT_EXPIRY_SECONDS)],
          ['client', CLIENT_NAME],
        ],
      }),
    );

    const replied = deferred<Reply>();
    let answered = false;

    const onReply = (incoming: NostrEvent) => {
      const replyIntent = readTag(incoming.tags, 'i');
      if (replyIntent === undefined) return;
      const failed = isFailureFor(intent, replyIntent);
      if (replyIntent !== REPLY_INTENT[intent] && !failed) {
        onNotice?.(incoming);
        return;
      }
      if (answered) return;
      answered = true;
      if (failed) {
        replied.reject(new RegbyError(replyIntent));
        return;
      }
      this.#open(incoming.content).then(
        (text) => replied.resolve({ content: text, tags: incoming.tags }),
        () => replied.reject(new RegbyError('malformed')),
      );
    };

    const sub = this.#pool.subscribeMany(
      relays,
      { kinds: [REGBY_KIND], authors: [peer], '#p': [this.#signer.pubkey], '#e': [event.id] },
      {
        onauth: this.#onauth,
        onevent: (incoming) => {
          // The relay filter is not a trust boundary: the pool verified the
          // signature, so pin the author and the correlation here.
          if (incoming.pubkey !== peer) return;
          if (!incoming.tags.some((tag) => tag[0] === 'e' && tag[1] === event.id)) return;
          onReply(incoming);
        },
      },
    );
    const close = () => sub.close();
    // The broker can answer before the publish below settles, so the reply
    // must already be observed, or an early refusal is an unhandled rejection.
    const reply = withTimeout(replied.promise, REGBY_REQUEST_TIMEOUT_MS);
    reply.catch(() => undefined);

    const published = await Promise.allSettled(
      this.#pool.publish(relays, event, { onauth: this.#onauth }),
    );
    if (!published.some((result) => result.status === 'fulfilled')) {
      close();
      throw new RegbyError('not-published');
    }

    return { reply, createdAt, close };
  }

  /** Plaintext of a broker reply; `""` travels unencrypted. */
  #open(content: string): Promise<string> {
    if (content === '') return Promise.resolve('');
    // The 4 KB cap is the relay's promise, not the event's: bound before
    // decrypting, with 2x slack so a relay counting bytes differently passes.
    if (content.length > REGBY_MAX_WIRE_BYTES * 2) return Promise.reject(new Error('oversized'));
    return this.#signer.decrypt(REGBY_MIDDLEMAN_PUBKEY, content);
  }

  /**
   * Connect and AUTH every relay before reading. These relays answer an
   * unauthenticated REQ with an empty EOSE instead of an auth-required, so a
   * reactive `onauth` alone would never see the reply. Ported from
   * `chat/src/services/nostr/authed-pool.ts`.
   */
  async #readyRelays(): Promise<string[]> {
    const results = await Promise.allSettled(
      REGBY_RELAYS.map(async (url) => {
        await this.#authenticate(url);
        return url;
      }),
    );
    const ready = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    if (ready.length === 0) throw new RegbyError('no-relay');
    return ready;
  }

  /** Throws only when the relay cannot be reached. A relay that connects but
   *  will not AUTH is kept: a publish there may still be accepted. */
  async #authenticate(url: string): Promise<void> {
    const relay = await this.#pool.ensureRelay(url, { connectionTimeout: RELAY_CONNECT_TIMEOUT_MS });
    for (let attempt = 0; attempt < AUTH_CHALLENGE_ATTEMPTS; attempt += 1) {
      try {
        await withTimeout(relay.auth(this.#onauth), AUTH_TIMEOUT_MS);
        return;
      } catch (err) {
        // The challenge lands a beat after connect; anything else is a refusal.
        if (!errorMessage(err).includes('no challenge')) return;
        await delay(AUTH_CHALLENGE_POLL_MS);
      }
    }
  }
}

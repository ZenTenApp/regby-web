/**
 * ReGBY wire vocabulary, app side. Mirrors regby-middleware `src/protocol.ts`
 * (see its docs/protocol.md). The reply intent decides the outcome, never the
 * content: a success may carry empty content, a failure always does.
 */
import { HEX_PUBKEY_RE, REGBY_CODE_LENGTH, REGBY_MAX_CONTENT_CHARS } from '@/config/regby';

export type RequestIntent = 'request_regby_code' | 'request_regby_content';

/** Success reply per request. */
export const REPLY_INTENT = {
  request_regby_code: 'regby_code',
  request_regby_content: 'regby_content',
} as const satisfies Record<RequestIntent, string>;

/** Unsolicited notice to the merchant once its code is redeemed. */
export const DELIVERED_INTENT = 'regby_content_delivered';

/** Failure replies per request. An intent missing here never matches and the
 *  user waits out the timeout, so keep it in step with the broker. */
export const FAILURE_INTENTS = {
  request_regby_code: ['regby_code_busy'],
  request_regby_content: [
    'regby_code_not_found',
    'regby_code_expired',
    'regby_code_already_redeemed',
    'regby_code_locked',
  ],
} as const satisfies Record<RequestIntent, readonly string[]>;

export type FailureIntent = (typeof FAILURE_INTENTS)[RequestIntent][number];

/** Everything that can stop a ReGBY round-trip, broker refusals included. */
export type RegbyErrorReason =
  | FailureIntent
  | 'empty'
  | 'too-long'
  | 'binary'
  | 'no-relay'
  | 'not-published'
  | 'timeout'
  | 'malformed'
  | 'signer';

/** Our own text for every reason. The broker sends no text, by design. */
export const REGBY_ERROR_TEXT: Record<RegbyErrorReason, string> = {
  regby_code_busy: 'ReGBY is busy right now. Try again in a moment.',
  regby_code_not_found: 'Invalid ReGBY Code. Please input the correct code.',
  regby_code_expired: 'This ReGBY Code has expired. Ask for a new one.',
  regby_code_already_redeemed: 'This ReGBY Code was already used.',
  regby_code_locked: 'This ReGBY Code is no longer valid. Ask for a new one.',
  empty: 'Enter something to share first.',
  'too-long': 'This text is too long for ReGBY. Shorten it and try again.',
  binary: 'This text contains characters ReGBY cannot carry.',
  'no-relay': 'Could not reach the ReGBY relays. Check your connection.',
  'not-published': 'No relay accepted the request. Try again.',
  timeout: 'ReGBY did not answer in time. Try again.',
  malformed: 'ReGBY sent an answer this app could not read.',
  signer: 'Your key could not sign or encrypt the request. Try again.',
};

export class RegbyError extends Error {
  override readonly name = 'RegbyError';
  readonly reason: RegbyErrorReason;

  constructor(reason: RegbyErrorReason) {
    super(REGBY_ERROR_TEXT[reason]);
    this.reason = reason;
  }
}

export function regbyErrorText(err: unknown): string {
  return err instanceof RegbyError ? err.message : REGBY_ERROR_TEXT.malformed;
}

const CODE_RE = new RegExp(`^\\d{${REGBY_CODE_LENGTH}}$`);

/** Exactly the wire form of a code: eight digits, nothing else. */
export function isRegbyCode(value: string): boolean {
  return CODE_RE.test(value);
}

/**
 * The bare digits of a typed or pasted code, or null. Whitespace is
 * the only separator tolerated, since the merchant screen shows spaced pairs;
 * a dash or dot would let a pasted date read as a code.
 */
export function normalizeRegbyCode(input: string): string | null {
  const digits = input.replace(/\s+/g, '');
  return isRegbyCode(digits) ? digits : null;
}

/** The broker silently drops content with these (raw bytes decoded as text);
 *  same class as the broker's `BINARY_RE`. */
const BINARY_RE = /[\u0000-\u0008\u000E-\u001F\uFFFD]/;

/** Throw the reason the broker would drop this content, before sending it. */
export function assertMintable(content: string): void {
  if (content.trim() === '') throw new RegbyError('empty');
  if (content.length > REGBY_MAX_CONTENT_CHARS) throw new RegbyError('too-long');
  if (BINARY_RE.test(content)) throw new RegbyError('binary');
}

export function readTag(tags: readonly string[][], name: string): string | undefined {
  return tags.find((tag) => tag[0] === name)?.[1];
}

/** A pairing tag's pubkey, or null when absent or not hex. */
export function readPubkeyTag(tags: readonly string[][], name: string): string | null {
  const value = readTag(tags, name);
  return value !== undefined && HEX_PUBKEY_RE.test(value) ? value : null;
}

/** Hidden and bidi characters used to spoof displayed text. */
const HIDDEN_CHARS_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;

/** Redeemed content as it is safe to display, plus whether anything was hidden.
 *  Copy still hands over the original text verbatim. */
export function displayableContent(content: string): { text: string; hadHidden: boolean } {
  const text = content.replace(HIDDEN_CHARS_RE, '');
  return { text, hadHidden: text.length !== content.length };
}

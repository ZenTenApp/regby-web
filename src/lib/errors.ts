/**
 * Error plumbing for the key and relay paths.
 *
 * The reference sniffed error strings to tell a wrong passphrase from a
 * malformed key (`/checkints|wrong passphrase/i`). That breaks the moment a
 * message is reworded, and it has to survive a `postMessage` hop here, so the
 * failure reason is carried as a typed code instead.
 */

/** A thrown value's message. `catch` binds `unknown`, and non-Error throws are
 *  routine across relay and WebSocket libraries. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error';
}

/** Why a key could not be turned into an identity. */
export type KeyErrorCode =
  /** Nothing in the text resembles an OpenSSH v1 private key. */
  | 'bad-format'
  /**
   * An OpenSSH key was found, but its bytes do not hold up - characters lost to
   * a partial selection, a line-wrapping mailer, or an editor that "fixed" the
   * text. Distinct from `bad-format` because the advice is opposite: the user
   * has the right key and needs to copy it again, not find a different one.
   */
  | 'damaged-key'
  /** Parsed fine, but has no passphrase. Refused rather than imported. */
  | 'unencrypted-key'
  | 'unsupported-cipher'
  | 'unsupported-kdf'
  | 'unsupported-keytype'
  /** OpenSSH check-int mismatch - the canonical wrong-passphrase signal. */
  | 'wrong-passphrase'
  | 'internal';

export class KeyError extends Error {
  readonly code: KeyErrorCode;

  constructor(code: KeyErrorCode, message: string) {
    super(message);
    this.name = 'KeyError';
    this.code = code;
  }
}

/** Message shown to the user for each failure. Kept beside the codes so the UI
 *  never has to invent wording for a case it does not know about. */
export const KEY_ERROR_TEXT: Record<KeyErrorCode, string> = {
  'bad-format': 'That does not look like an OpenSSH private key.',
  'damaged-key':
    'This is an OpenSSH key, but the text is incomplete or altered. Copy the whole key again - ' +
    'from the first character to the last.',
  'unencrypted-key': 'This key has no passphrase. Only passphrase-protected keys can be imported.',
  'unsupported-cipher': 'Unsupported cipher - this app reads aes256-ctr keys.',
  'unsupported-kdf': 'Unsupported key derivation - this app reads bcrypt keys.',
  'unsupported-keytype': 'Unsupported key type - this app reads Ed25519 keys.',
  'wrong-passphrase': 'Wrong passphrase - could not decrypt the key.',
  internal: 'Something went wrong while reading the key.',
};

/** Narrow an unknown throw to its code, defaulting to `internal`. */
export function keyErrorCode(err: unknown): KeyErrorCode {
  return err instanceof KeyError ? err.code : 'internal';
}

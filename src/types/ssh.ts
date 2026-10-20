/**
 * OpenSSH Ed25519 private-key types.
 *
 * Modelled as a discriminated union rather than the reference's optional
 * fields (`kdfSalt?`, consumed via `kdfSalt!`): under
 * `exactOptionalPropertyTypes` the optional form is hostile, and the union
 * makes "an unencrypted key is not acceptable" a typed narrowing instead of a
 * runtime string check.
 */

/** What every key carries, whatever protects its private block. */
interface ParsedKeyBase {
  cipherName: string;
  /** The public key blob, stored in the clear beside the private block; the
   *  decrypted seed must match it. */
  publicKey: Uint8Array;
  encrypted: Uint8Array;
}

/** A key whose private block is stored in the clear. Rejected at login. */
export interface UnencryptedParsedKey extends ParsedKeyBase {
  kdfName: 'none';
}

/** A passphrase-protected key: bcrypt_pbkdf KDF over an aes256-ctr block. */
export interface EncryptedParsedKey extends ParsedKeyBase {
  kdfName: 'bcrypt';
  kdfSalt: Uint8Array;
  kdfRounds: number;
}

export type ParsedKey = UnencryptedParsedKey | EncryptedParsedKey;

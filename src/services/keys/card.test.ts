/**
 * Cards: the card label is the BIP39 passphrase over the wallet's words, as
 * in zentenpay (`zentenpay/__tests__/card-derivation.test.ts`), so any BIP39
 * wallet recovers the Card from the wallet plus the label. The vector is the
 * official BIP39 one for 32 zero bytes of entropy with passphrase "TREZOR":
 * https://raw.githubusercontent.com/trezor/python-mnemonic/master/vectors.json
 */
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { getPublicKey } from 'nostr-tools/pure';
import { describe, expect, it } from 'vitest';

import { bip39SeedFromSshSeed, nostrKeyFromSshSeed } from './nip06';
import { normalizeCardLabel } from './ssh-login';

const ZERO_SEED = new Uint8Array(32);
const TREZOR_SEED =
  'bda85446c68413707090a52022edd26a1c9462295029f2e60cd7c4f2bbd3097170af7a4d73245cafa9c3cca8d561a7c3de6f5d4a10be8ed2a5e608d68f92fcc8';

/** The seed of `ssh/__fixtures__/encrypted-ed25519.pem`, as in subaccount.test.ts. */
const SSH_SEED = 'c9c8308cb9b2d9152198f80253d7de5c256a43eed7c9d4dc7163eed1fb57a32d';

function pubkeyOf(cardLabel: string): string {
  return getPublicKey(nostrKeyFromSshSeed(hexToBytes(SSH_SEED), cardLabel));
}

describe('Card label', () => {
  it('is the standard BIP39 passphrase over the seed as words', () => {
    expect(bytesToHex(bip39SeedFromSshSeed(ZERO_SEED, 'TREZOR'))).toBe(TREZOR_SEED);
  });

  it('opens a different identity from the wallet, the same one for the same label', () => {
    const card = pubkeyOf('my card');
    expect(card).not.toBe(pubkeyOf(''));
    expect(card).not.toBe(pubkeyOf('other card'));
    expect(card).toBe(pubkeyOf('my card'));
  });

  it('is case sensitive', () => {
    expect(pubkeyOf('Card')).not.toBe(pubkeyOf('card'));
  });

  it('drops only surrounding whitespace', () => {
    expect(normalizeCardLabel('  my card \n')).toBe('my card');
    expect(normalizeCardLabel('   ')).toBe('');
  });
});

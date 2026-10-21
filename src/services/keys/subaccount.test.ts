/**
 * The login subaccount must match chat and meltify. The vector is chat's
 * (`chat/src/services/crypto/subaccount.test.ts`): the seed of
 * `ssh/__fixtures__/encrypted-ed25519.pem` and what `meltify <that key> -s
 * alice` printed.
 */
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { describe, expect, it } from 'vitest';

import { deriveSubaccountSeed } from './subaccount';

const SSH_SEED = 'c9c8308cb9b2d9152198f80253d7de5c256a43eed7c9d4dc7163eed1fb57a32d';

describe('deriveSubaccountSeed', () => {
  it('is meltify -s', () => {
    expect(bytesToHex(deriveSubaccountSeed(hexToBytes(SSH_SEED), 'alice'))).toBe(
      '4dc67c59bf39c9c3cd26311e1cb7d2bb6801943efef2d830b2f91864870e5d5d',
    );
  });

  it('does not mutate the seed', () => {
    const seed = hexToBytes(SSH_SEED);
    deriveSubaccountSeed(seed, 'alice');
    expect(bytesToHex(seed)).toBe(SSH_SEED);
  });
});

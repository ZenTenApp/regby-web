/**
 * The same SSH key must be the same npub here as in chat and usdt-pay. The
 * expected pubkeys are chat's own vectors (`chat/src/services/ssh/ssh.test.ts`),
 * which chat in turn pinned against usdt-pay's original implementation.
 */
import { readFileSync } from 'node:fs';

import { getPublicKey } from 'nostr-tools/pure';
import { describe, expect, it } from 'vitest';

import { convertOpenSSHEd25519 } from '@/services/ssh';

import { nostrKeyFromSshSeed } from './nip06';

function fixture(name: string): string {
  return readFileSync(new URL(`../ssh/__fixtures__/${name}`, import.meta.url), 'utf8');
}

function pubkeyOf(file: string, passphrase: string): string {
  return getPublicKey(nostrKeyFromSshSeed(convertOpenSSHEd25519(fixture(file), passphrase)));
}

describe('SSH key to Nostr identity', () => {
  it('matches chat and usdt-pay for the reference key', () => {
    expect(pubkeyOf('encrypted-ed25519.pem', 'test-passphrase')).toBe(
      '7c52c14bcdcdbbaad867fab72e72dc290b8ddb924f360d428b2e4e550a51fe60',
    );
  });

  it('handles a non-ASCII passphrase', () => {
    expect(pubkeyOf('encrypted-unicode-ed25519.pem', 'pässwörd-ünïcode-✓')).toBe(
      'a24e9f79f075b39e1340bede97eef66cb431ddc919359efa91fbe33b2da5bfe6',
    );
  });

  it('refuses a wrong passphrase', () => {
    expect(() => pubkeyOf('encrypted-ed25519.pem', 'nope')).toThrow(
      expect.objectContaining({ code: 'wrong-passphrase' }),
    );
  });

  it('refuses an unencrypted key', () => {
    expect(() => pubkeyOf('unencrypted-ed25519.pem', '')).toThrow(
      expect.objectContaining({ code: 'unencrypted-key' }),
    );
  });
});

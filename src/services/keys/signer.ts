/**
 * The one identity a session signs, encrypts and decrypts with, behind a
 * single interface whatever the login method. A local key (generated or
 * SSH-derived) lives only in this closure; a NIP-07 key never leaves the
 * extension.
 */
import { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent } from 'nostr-tools/pure';
import type { EventTemplate, VerifiedEvent } from 'nostr-tools/pure';
import { decrypt as nip04Decrypt, encrypt as nip04Encrypt } from 'nostr-tools/nip04';

import { wipe } from '@/lib/bytes';

export interface Signer {
  readonly pubkey: string;
  signEvent(template: EventTemplate): Promise<VerifiedEvent>;
  /** NIP-04, the only scheme the broker opens a kind 4 with. */
  encrypt(peer: string, plaintext: string): Promise<string>;
  decrypt(peer: string, ciphertext: string): Promise<string>;
  /** Zero the local key. A no-op for an extension. */
  dispose(): void;
}

/** Takes ownership of `secretKey`; `dispose` wipes it. */
export function localSigner(secretKey: Uint8Array): Signer {
  const pubkey = getPublicKey(secretKey);
  return {
    pubkey,
    signEvent: (template) => Promise.resolve(finalizeEvent(template, secretKey)),
    encrypt: (peer, plaintext) => Promise.resolve(nip04Encrypt(secretKey, peer, plaintext)),
    decrypt: (peer, ciphertext) => Promise.resolve(nip04Decrypt(secretKey, peer, ciphertext)),
    dispose: () => wipe(secretKey),
  };
}

/** A fresh throwaway identity for this tab only. */
export function generatedSigner(): Signer {
  return localSigner(generateSecretKey());
}

export class ExtensionError extends Error {
  override readonly name = 'ExtensionError';
}

/**
 * Connect a NIP-07 extension. Refuses one without NIP-04, since every ReGBY
 * message is a NIP-04 kind 4, and re-verifies every signature it hands back:
 * an extension is another program, and a bad signature would only surface as
 * a relay silently dropping the request.
 */
export async function extensionSigner(): Promise<Signer> {
  const nostr = window.nostr;
  if (!nostr) throw new ExtensionError('No Nostr signer extension found in this browser.');
  const nip04 = nostr.nip04;
  if (!nip04) throw new ExtensionError('Your signer extension does not support NIP-04 encryption.');
  const pubkey = await nostr.getPublicKey();
  return {
    pubkey,
    signEvent: async (template) => {
      const event = await nostr.signEvent(template);
      if (event.pubkey !== pubkey || !verifyEvent(event)) {
        throw new ExtensionError('The signer extension returned an invalid signature.');
      }
      return event;
    },
    encrypt: (peer, plaintext) => nip04.encrypt(peer, plaintext),
    decrypt: (peer, ciphertext) => nip04.decrypt(peer, ciphertext),
    dispose: () => undefined,
  };
}

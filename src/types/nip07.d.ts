/** NIP-07 browser signer (Alby, nos2x, ...). Only what ReGBY calls. */
import type { Event, EventTemplate } from 'nostr-tools';

interface Nip07Nip04 {
  encrypt(pubkey: string, plaintext: string): Promise<string>;
  decrypt(pubkey: string, ciphertext: string): Promise<string>;
}

interface Nip07 {
  getPublicKey(): Promise<string>;
  signEvent(event: EventTemplate): Promise<Event>;
  nip04?: Nip07Nip04;
}

declare global {
  interface Window {
    nostr?: Nip07;
  }
}

import { nip19 } from 'nostr-tools';

/** The full bech32 npub, for copying. */
export function npub(hex: string): string {
  return nip19.npubEncode(hex);
}

/** `npub1…wxyz`: the prefix plus the last four characters, enough to tell
 *  peers apart at a glance. */
export function shortNpub(hex: string): string {
  const full = npub(hex);
  return `${full.slice(0, 5)}…${full.slice(-4)}`;
}

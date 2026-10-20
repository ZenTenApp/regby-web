import { nip19 } from 'nostr-tools';

/** `npub1…wxyz`: the prefix plus the last four characters, enough to tell
 *  peers apart at a glance. */
export function shortNpub(hex: string): string {
  const npub = nip19.npubEncode(hex);
  return `${npub.slice(0, 5)}…${npub.slice(-4)}`;
}

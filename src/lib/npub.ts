import { nip19 } from 'nostr-tools';

/** `npub1abcd…wxyz`: enough to recognise a peer without a wall of bech32. */
export function shortNpub(hex: string): string {
  const npub = nip19.npubEncode(hex);
  return `${npub.slice(0, 10)}…${npub.slice(-6)}`;
}

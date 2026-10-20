/**
 * ReGBY wire constants. Each mirrors a value in regby-middleware or a limit
 * the dedicated DM relays enforce; a drift here is a request the broker or
 * the relays silently drop.
 */

export const HEX_PUBKEY_RE = /^[0-9a-f]{64}$/;

const rawMiddlemanPubkey: string = import.meta.env.VITE_REGBY_MIDDLEMAN_PUBKEY ?? '';
// Fail at load: a malformed key would otherwise die inside the NIP-04 ECDH.
if (!HEX_PUBKEY_RE.test(rawMiddlemanPubkey)) {
  throw new Error('VITE_REGBY_MIDDLEMAN_PUBKEY must be 64 lowercase hex chars (see .env.example)');
}
/** The broker's pubkey; every request is encrypted to it and every reply must be signed by it. */
export const REGBY_MIDDLEMAN_PUBKEY = rawMiddlemanPubkey;

/** Operator-run DM relays: kind 4 only, NIP-42 AUTH, `client` tag required. */
export const REGBY_RELAYS: readonly string[] = [
  'wss://dm1.zentext.me',
  'wss://dm2.nostr.box',
  'wss://dm3.npub.cx',
];

export const REGBY_KIND = 4;

/** NIP-89 `client` tag value; the DM relays refuse writes without one. */
export const CLIENT_NAME = 'regby-web';

/** Code length and its display grouping (four pairs, one colour each). */
export const REGBY_CODE_LENGTH = 8;
export const REGBY_CODE_GROUP = 2;

/** A code lives one minute from the merchant's request `created_at`. */
export const REGBY_CODE_TTL_SECONDS = 60;

/** Relays cap NIP-40 expiration at 72 h; one minute under absorbs clock skew. */
export const REGBY_EVENT_EXPIRY_SECONDS = 72 * 60 * 60 - 60;

/** Broker cap on plaintext characters. */
export const REGBY_MAX_CONTENT_CHARS = 4096;

/** Relay cap on the ENCRYPTED content field, in bytes. */
export const REGBY_MAX_WIRE_BYTES = 4 * 1024;

/** How long to wait for the broker to answer a request. */
export const REGBY_REQUEST_TIMEOUT_MS = 20_000;

/** Keep listening for `regby_content_delivered` this long past expiry, so a
 *  redeem in the code's last second still reaches the merchant screen. */
export const REGBY_DELIVERED_GRACE_MS = 30_000;

export const RELAY_CONNECT_TIMEOUT_MS = 6_000;

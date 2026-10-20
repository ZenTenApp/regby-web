# regby-web

Web client for ReGBY (see `../regby-middleware/docs/protocol.md`). A merchant
sends any text to the broker and shows the returned 8-digit code as QR and
digits; a customer scans or types the code and gets the text back.

## Rules
- The broker is untrusted. Never render broker-supplied text except the
  redeemed content, and render that as plain text only (no HTML, no links).
- The reply intent decides success or failure, never the content: a success
  may carry empty content.
- Empty content is never encrypted, in either direction.
- Every published event carries `["client", "regby-web"]` (DM relays reject
  writes without one) and a NIP-40 `expiration` within 72 h.
- The SSH login must derive the same npub as `chat` and `usdt-pay`:
  Ed25519 seed -> BIP39 entropy -> NIP-06 `m/44'/1237'/0'/0/0`.
- Secrets (PEM, passphrase, secret key) never enter React state.

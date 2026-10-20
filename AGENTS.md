# regby-web

Web client for ReGBY (see `../regby-middleware/docs/protocol.md`). A merchant
sends any text to the broker and shows the text itself as a QR plus the
returned 8-digit code as digits; a customer scans the QR and reads the text
directly, or types the code and gets the text back through the broker.

## Rules
- The broker is untrusted. Never render broker-supplied text except the
  redeemed content, and render that as plain text only (no HTML, no links).
  Text from a scanned QR is equally untrusted and gets the same treatment.
- The reply intent decides success or failure, never the content: a success
  may carry empty content.
- Empty content is never encrypted, in either direction.
- Every event about a code carries it as `["regby_code", <code>]`, matching
  the broker's replies (the merchant's first request has no code yet).
- Every published event carries `["client", "regby-web"]` (DM relays reject
  writes without one) and a NIP-40 `expiration` within 72 h.
- The SSH login must derive the same npub as `chat` and `usdt-pay`:
  Ed25519 seed -> BIP39 entropy -> NIP-06 `m/44'/1237'/0'/0/0`.
- Secrets (PEM, passphrase, secret key) never enter React state.

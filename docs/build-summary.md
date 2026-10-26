# regby-web: how it was built

Summary of the session that created this project (2026-10-19).

## The request

A new web app in `nostrdev/regby-web`, built from the design PNGs in the
project root and this spec:

- **Merchant**: pick role, log in (extension, or SSH key pasted or from file),
  enter multi-line content, generate a code, see a QR and the ReGBY code.
- **Customer**: code inputs under an empty text box, the keyboard hidden until
  an input is tapped; then the redeemed content shown in that box as plain
  text (newlines kept, like a chat app) with a Copy button. The merchant's QR
  is read by the phone's own camera; the app has no scanner.
- Every screen has a Back button.

## Sources read before writing code

- `regby-middleware/docs/protocol.md`, `flow-examples.md`,
  `recipient-checks.md`, and `src/protocol.ts` (binary-content regex, code
  shape). These define the wire format the app speaks.
- `usdt-pay/utils/regby.ts`, `config/nostr.ts`: the existing app-side client
  (relays, failure intents, `client` tag, expiry, size caps).
- `chat/src/services/ssh/*`, `services/worker/*`, `services/crypto/nip06.ts`,
  `services/nostr/authed-pool.ts`, `pages/LoginPage.tsx`: the SSH-key login
  and the NIP-42 pre-auth that this app ports.

## Decisions

| topic | decision | why |
| --- | --- | --- |
| Stack | Vite, React 19, strict TS, `nostr-tools`, `qrcode`, `lucide-react`, `@fontsource/inter` | Matches `chat`; strict CSP means no CDN fonts |
| Login options | Generate KeyPair, Login with Signer (NIP-07), Login with SSH Key | The Login PNG shows all three (its "Paste SSH Key" renamed); spec names the last two |
| SSH derivation | Ed25519 seed, BIP39 entropy, NIP-06 `m/44'/1237'/0'/0/0` | Same npub as chat and usdt-pay; pinned by a test using chat's vectors |
| Unencrypted SSH keys | Refused | Same rule as chat |
| bcrypt | In a module Web Worker, terminated after login | Seconds-long synchronous call; terminating drops cloned secrets |
| Secrets | PEM and passphrase live in DOM refs, never React state | Ported discipline from chat |
| Session | In memory only; reload signs out | Simplest and safest |
| Relays | `dm1.zentext.me`, `dm2.nostr.box`, `dm3.npub.cx`, AUTH before every request | These relays return an empty EOSE to an unauthenticated REQ |
| Requests | kind 4, NIP-04, tags `p`, `i`, `expiration` (72 h less 60 s), `client=regby-web`; `regby_code` on the redeem request | Broker and relay requirements |
| Replies | Subscribe on `#e` before publishing; author pinned to the broker; intent decides, never content; `""` never decrypted; `regby_code` tag must match the code when present | Protocol rules |
| Failure text | App's own text per failure intent | Broker sends no text by design |
| Mint pre-checks | Over 4096 chars, broker's binary class, encrypted size over 4 KB. Empty is valid and sent as a raw `""` | Broker or relay would silently drop these |
| QR payload | The content itself; the code is typed only | Changed after v1.0.0 at the user's request. Text over QR capacity (~2.9 KB) shows a fallback pointing to the code |
| Display of redeemed text | Plain text, `white-space: pre-wrap`, hidden and bidi characters stripped for display only; Copy keeps the original | Broker is untrusted |
| Merchant code screen | Countdown from the request `created_at`, "Redeemed by npub…" on `regby_content_delivered`, "Generate new code" after expiry | Broker anchors expiry to `created_at` |
| Broker key | `VITE_REGBY_MIDDLEMAN_PUBKEY` in `.env`, production key by default | Validated as 64 hex at load |

## Verification

- `tsc -b` clean, `vite build` clean, `vitest` passes (code
  normalisation, mint pre-checks, display sanitising, SSH-to-npub parity).
- Screenshots at desktop and 390 px compared with the PNGs. Fixed during
  review: textarea text running under the Paste/Clear buttons, title size on
  mobile, an ignored `frame-ancestors` CSP directive.
- End-to-end against a real broker on the real DM relays: code minted, wrong
  code showed "Invalid ReGBY Code. Please input the correct code.", content
  arrived byte for byte (newlines, spaces, unicode), merchant saw "Redeemed
  by", reuse refused.
- Bug found and fixed: a broker refusal arriving before the publish settled
  was an unhandled rejection; the reply promise is now observed before
  publishing.

## Open points

- The key in `regby-middleware/.env` (`abd143…`, called local) is also used
  by another running broker, likely staging. During the test both answered
  and the app took the other one's code. The local broker was stopped and
  its day file deleted. Give local runs their own key.
- No testing against the production broker was done.
- The design PNGs still sit in the project root.
- Nothing is committed; the repo was only `git init`ed.

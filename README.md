# regby-web

Mobile-friendly web client for [ReGBY](../regby-middleware/docs/protocol.md).

- **Merchant**: enter any text (empty allowed: shows an empty-QR placeholder), get it back as a QR plus a one-minute 8-digit
  code shown as four coloured pairs. The screen flips to "Redeemed by npub…"
  when a customer redeems the code. If anyone else typed it too, the code is
  void and the merchant starts over with a new one.
- **Customer**: read the QR with the phone's own camera (the text itself, no
  broker involved) or type the code (redeemed through the broker); the
  merchant's text is shown exactly as written, with a Copy button.

Login, after picking a role: a throwaway key for this tab, a NIP-07 signer
extension, or a passphrase-protected Ed25519 OpenSSH key (pasted or from
file). The SSH key derives the same npub as `chat` and `usdt-pay`; its
Wallet Label is `meltify -s`, and an optional Card Label opens that wallet's
Card as in zentenpay.

## Run

```bash
npm install
cp .env.example .env     # broker pubkey, production by default
npm run dev              # http://localhost:5173
npm run dev:lan          # https on the LAN, so Paste works on a phone
```

| script | does |
| --- | --- |
| `npm run build` | typecheck and build to `dist/` (static, host anywhere over https) |
| `npm run build:staging` | the same against the staging broker, served from `/regby-staging/` |
| `npm run typecheck` | `tsc -b` |
| `npm test` | protocol helpers and SSH-to-npub parity vectors |

## Deploy

Push to `main` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml):
a `feat`/`fix` commit releases (semantic-release tags `vX.Y.Z`, writes
`CHANGELOG.md`) and uploads `dist/` to https://regby.nostr.box/ over SFTP;
other commit types do nothing. The broker key comes from `.env.production`.

Push to `staging` runs
[.github/workflows/deploy-staging.yml](.github/workflows/deploy-staging.yml):
every push builds with `npm run build:staging` (the staging broker key from
`.env.staging`, base path `/regby-staging/`) and uploads to
https://nostr.box/regby-staging/. No release or tag. Both workflows upload
through [scripts/deploy-sftp.sh](scripts/deploy-sftp.sh).

Repo secrets: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH` (the docroot),
`DEPLOY_PATH_STAGING` (the `regby-staging` folder in nostr.box's docroot,
emptied of anything the build lacks on every deploy), `DEPLOY_SSH_KEY`,
`DEPLOY_KNOWN_HOSTS` (`ssh-keyscan <DEPLOY_HOST>`, unhashed),
`MATRIX_ACCESS_TOKEN`.

## Layout

| path | role |
| --- | --- |
| `src/config/regby.ts` | Broker pubkey, DM relays, wire limits |
| `src/services/regby/` | Intents, failure texts, the relay round-trip |
| `src/services/keys/` | Signers (generated, NIP-07, SSH), NIP-06 derivation |
| `src/services/ssh/`, `src/services/worker/` | OpenSSH parsing and the bcrypt key worker, ported from `chat` |
| `src/screens/` | One file per screen; `src/App.tsx` holds the flow |

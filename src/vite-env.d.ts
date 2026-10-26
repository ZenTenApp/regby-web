/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  readonly VITE_REGBY_MIDDLEMAN_PUBKEY?: string;
}

/** package.json version, stamped in by vite.config.ts. */
declare const __APP_VERSION__: string;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REGBY_MIDDLEMAN_PUBKEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';

import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import svgr from 'vite-plugin-svgr';
import tsconfigPaths from 'vite-tsconfig-paths';

// CI's release step sets package.json to the version being tagged before it
// builds, so the footer always names the release that is deployed.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

export default defineConfig(({ command, mode }) => {
  // `src/config/regby.ts` checks the broker key only when the page loads, so a
  // build without one would deploy a site that throws on open. Fail here instead.
  if (command === 'build') {
    const key = loadEnv(mode, process.cwd(), 'VITE_').VITE_REGBY_MIDDLEMAN_PUBKEY ?? '';
    if (!/^[0-9a-f]{64}$/.test(key)) {
      throw new Error('VITE_REGBY_MIDDLEMAN_PUBKEY must be 64 lowercase hex chars (see .env.production)');
    }
  }

  return {
    define: { __APP_VERSION__: JSON.stringify(version) },

    // Browsers only allow clipboard reads (Paste) on a secure origin. `localhost`
    // counts, a phone on the LAN does not, so `npm run dev:lan` serves a self-signed cert.
    // svgr turns `*.svg?react` imports into components, so icons inherit `currentColor`.
    plugins: [react(), svgr(), tsconfigPaths(), ...(mode === 'lan' ? [basicSsl()] : [])],

    // The key worker is an ES module importing the ssh services, so the `@/`
    // alias has to be registered for the worker build too.
    worker: { format: 'es', plugins: () => [tsconfigPaths()] },

    // CommonJS deps of the SSH path; pre-bundled so the worker resolves them.
    optimizeDeps: { include: ['bcrypt-pbkdf', 'tweetnacl'] },

    // Tests import `config/regby.ts`, which needs the broker key at load. CI has
    // no `.env`, so take the committed production value instead.
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      env: loadEnv('production', process.cwd(), 'VITE_'),
    },
  };
});

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vitest/config';

/** The Android build number baked into this bundle — `versionCode` in build.gradle is the single source of truth. */
function appVersionCode(): number {
  try {
    const gradle = fs.readFileSync(path.resolve(__dirname, 'android/app/build.gradle'), 'utf8');
    return Number(/versionCode\s+(\d+)/.exec(gradle)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

export default defineConfig(() => {
  return {
    define: {
      __APP_VERSION_CODE__: JSON.stringify(appVersionCode()),
    },
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

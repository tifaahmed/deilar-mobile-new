/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Deilar API, e.g. https://example.com/api/v1 */
  readonly VITE_API_URL?: string;
}

/** Android `versionCode` of this build, injected by vite.config.ts (0 when unknown, e.g. plain web). */
declare const __APP_VERSION_CODE__: number;

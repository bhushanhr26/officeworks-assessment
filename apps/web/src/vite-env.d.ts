/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of OUR API. Exposed to the browser, so never put secrets in VITE_* vars. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

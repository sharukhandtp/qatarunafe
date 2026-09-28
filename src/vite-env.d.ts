/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API origin for builds served apart from the API. Empty means same origin. */
  readonly VITE_API_BASE_URL?: string
  /** Dev-server proxy target for /api. */
  readonly VITE_API_PROXY_TARGET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Development only: "true" turns on Request changes (see featureFlags.ts). */
  readonly VITE_ENABLE_REQUEST_CHANGES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

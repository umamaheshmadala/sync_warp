/// <reference types="vite/client" />
declare const __BUILD_TIMESTAMP__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_ENV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'virtual:build-info' {
  export const timestamp: string
}

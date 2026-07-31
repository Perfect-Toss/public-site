/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_ENVIRONMENT?: string;
  readonly VITE_GIT_SHA?: string;
}

// Extend the existing ImportMeta interface
declare global {
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }

  // Build-time injected globals (see vite.config.ts `define`)
  const __APP_VERSION__: string;
  const __BUILD_SHA__: string;
  const __BUILD_TIMESTAMP__: string;
  const __BUILD_ENVIRONMENT__: string;
}

export {}; // Make this a module

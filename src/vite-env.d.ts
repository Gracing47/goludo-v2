/// <reference types="vite/client" />

/**
 * Vite Environment Variables Type Definitions
 * 
 * Extends ImportMeta interface to include Vite's env object.
 * This enables TypeScript autocomplete and type checking for environment variables.
 * 
 * @see https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript
 */

interface ImportMetaEnv {
    readonly VITE_APP_TITLE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
    // Add more env variables as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

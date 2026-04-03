/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PREFIX: string;
  readonly VITE_KAFKA_UI_URL?: string;
  readonly VITE_USER_CREATED_TOPIC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

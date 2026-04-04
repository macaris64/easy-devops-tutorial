/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PREFIX: string;
  readonly VITE_KAFKA_UI_URL?: string;
  readonly VITE_KAFKA_USER_EVENTS_TOPIC?: string;
  readonly VITE_KAFKA_ROLE_EVENTS_TOPIC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

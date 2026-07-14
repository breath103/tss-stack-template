/// <reference types="node" />
/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    SITE_URL: string;
    REQUIRED_FOO: string;
    OPTIONAL_FOO: string | undefined;
  }
}

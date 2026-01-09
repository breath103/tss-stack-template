declare namespace NodeJS {
  interface ProcessEnv {
    REQUIRED_FOO: string;
    OPTIONAL_FOO: string | undefined;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    BETTER_AUTH_SECRET: string;
  }
}

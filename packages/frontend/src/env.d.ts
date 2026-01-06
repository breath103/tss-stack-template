declare namespace NodeJS {
  interface ProcessEnv {
    REQUIRED_FOO: string;
    OPTIONAL_FOO: string | undefined;
  }
}

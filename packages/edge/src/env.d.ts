// Both are substituted into the bundle by esbuild at build time (see the `define`
// block in `scripts/deploy.ts`), so they are always strings in the deployed Lambda —
// never absent, and never worth a `!` at each use site.
declare namespace NodeJS {
  interface ProcessEnv {
    PROJECT: string;
    SSM_REGION: string;
  }
}

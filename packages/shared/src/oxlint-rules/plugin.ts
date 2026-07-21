// oxlint JS plugin bundling astra's project-specific lint rules under the
// `local` namespace. Loaded via `jsPlugins` in the backend and frontend
// `.oxlintrc.json`. oxlint's plugin loader requires explicit `.ts` extensions
// on relative imports; this file is only loaded by oxlint, never type-checked.
import noExtraneousDependencies from "./no-extraneous-dependencies.ts";
import noSingleUseType from "./no-single-use-type.ts";

export default {
  meta: { name: "local" },
  rules: {
    "no-single-use-type": noSingleUseType,
    "no-extraneous-dependencies": noExtraneousDependencies,
  },
};

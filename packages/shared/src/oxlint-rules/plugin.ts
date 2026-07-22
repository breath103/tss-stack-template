// oxlint JS plugin bundling the template's project-specific lint rules under the
// `local` namespace. Loaded via `jsPlugins` in the backend and frontend
// `.oxlintrc.json`. oxlint's plugin loader requires explicit `.ts` extensions
// on relative imports; this file is only loaded by oxlint, never type-checked.
//
// A rule may declare `meta.requires` naming an optional add-on (e.g. "supabase").
// Such a rule is a no-op unless the add-on is listed in the project's `tss.json`
// `uses` array — so the same plugin ships everywhere and each project's manifest
// decides which add-on rules are live. Untagged (baseline) rules always run.
import { isEnabled, projectUses } from "../uses.ts";
import noExtraneousDependencies from "./no-extraneous-dependencies.ts";
import noSelectStar from "./no-select-star.ts";
import noSingleUseType from "./no-single-use-type.ts";

const uses = projectUses();
const gate = (rule: { meta?: { requires?: string | string[] } }) =>
  isEnabled(rule.meta?.requires, uses) ? rule : { ...rule, create: () => ({}) };

export default {
  meta: { name: "local" },
  rules: {
    "no-single-use-type": gate(noSingleUseType),
    "no-extraneous-dependencies": gate(noExtraneousDependencies),
    "no-select-star": gate(noSelectStar),
  },
};

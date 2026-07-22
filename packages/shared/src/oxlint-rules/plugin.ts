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
import noAsError from "./no-as-error.ts";
import noDoubleCast from "./no-double-cast.ts";
import noEntitiesIndex from "./no-entities-index.ts";
import noExtraneousDependencies from "./no-extraneous-dependencies.ts";
import noHandWrittenEventGuard from "./no-hand-written-event-guard.ts";
import noI18nProp from "./no-i18n-prop.ts";
import noInlineDatabaseRowType from "./no-inline-database-row-type.ts";
import noInlineFontSize from "./no-inline-font-size.ts";
import noManualCalendarDate from "./no-manual-calendar-date.ts";
import noManualDateFormat from "./no-manual-date-format.ts";
import noNativeDateInput from "./no-native-date-input.ts";
import noProcessEnvBang from "./no-process-env-bang.ts";
import noRawFetch from "./no-raw-fetch.ts";
import noSelectStar from "./no-select-star.ts";
import noSingleUseType from "./no-single-use-type.ts";
import noTemplateLiteralClassname from "./no-template-literal-classname.ts";

const uses = projectUses();
const gate = (rule: { meta?: { requires?: string | string[] } }) =>
  isEnabled(rule.meta?.requires, uses) ? rule : { ...rule, create: () => ({}) };

export default {
  meta: { name: "local" },
  rules: {
    "no-single-use-type": gate(noSingleUseType),
    "no-extraneous-dependencies": gate(noExtraneousDependencies),
    "no-as-error": gate(noAsError),
    "no-double-cast": gate(noDoubleCast),
    "no-entities-index": gate(noEntitiesIndex),
    "no-hand-written-event-guard": gate(noHandWrittenEventGuard),
    "no-i18n-prop": gate(noI18nProp),
    "no-inline-database-row-type": gate(noInlineDatabaseRowType),
    "no-inline-font-size": gate(noInlineFontSize),
    "no-manual-calendar-date": gate(noManualCalendarDate),
    "no-manual-date-format": gate(noManualDateFormat),
    "no-native-date-input": gate(noNativeDateInput),
    "no-process-env-bang": gate(noProcessEnvBang),
    "no-raw-fetch": gate(noRawFetch),
    "no-select-star": gate(noSelectStar),
    "no-template-literal-classname": gate(noTemplateLiteralClassname),
  },
};

import type { Linter } from "eslint";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

import eslint from "@eslint/js";
import stylistic, { type RuleOptions as StylisticRuleOptions } from "@stylistic/eslint-plugin";

interface FactoryOpts {
  /** Absolute path used as `tsconfigRootDir` for typescript-eslint's projectService.
   * Each flat-config file lives next to its own tsconfig — this lets one
   * factory serve `packages/backend/eslint.config.ts` and
   * `e2e/eslint.config.ts` while pointing each at the right tsconfig. */
  tsconfigRootDir: string;
}

/** Shared lint config used by every flat-config consumer in the repo.
 * Per-tree configs add their own `ignores` / `files` overrides on top. */
export function createEslintConfig({ tsconfigRootDir }: FactoryOpts): Linter.Config[] {
  return [
    eslint.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    stylistic.configs.customize({
      indent: 2,
      quotes: "double",
      semi: true,
      arrowParens: false,
      commaDangle: "only-multiline",
      braceStyle: "1tbs",
    }),
    {
      rules: {
        "@stylistic/operator-linebreak": "off",
        "@stylistic/arrow-parens": "off",
        "@stylistic/member-delimiter-style": ["error", {
          multiline: { delimiter: "semi", requireLast: true },
          singleline: { delimiter: "semi", requireLast: false },
          multilineDetection: "brackets",
        }],
      } satisfies { [K in keyof StylisticRuleOptions]?: Linter.RuleSeverity | [Linter.RuleSeverity, ...StylisticRuleOptions[K]]; },
    },
    {
      languageOptions: {
        parserOptions: {
          projectService: {
            allowDefaultProject: ["*.config.ts"],
          },
          tsconfigRootDir,
        },
      },
      plugins: {
        "simple-import-sort": simpleImportSort,
        "unicorn": unicorn,
      },
      rules: {
        "quotes": ["error", "double", { avoidEscape: true }],
        "comma-spacing": ["error", { before: false, after: true }],
        "@typescript-eslint/no-unnecessary-condition": ["error", { allowConstantLoopConditions: true }],
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-inferrable-types": "error",
        "@typescript-eslint/require-await": "warn",
        "simple-import-sort/imports": ["error", {
          groups: [
            ["^node:"],
            ["^[a-z]"],
            ["^@(?!/)"],
            ["^@/"],
            ["^\\."],
          ],
        }],
        "simple-import-sort/exports": "error",
        "unicorn/prefer-node-protocol": "error",
      },
    },
  ];
}

export default [
  { ignores: ["dist/**", "cdk.out/**"] },
  ...createEslintConfig({ tsconfigRootDir: import.meta.dirname }),
  {
    files: ["src/**/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
];

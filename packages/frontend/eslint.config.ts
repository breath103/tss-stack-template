import type { Linter } from "eslint";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

import eslint from "@eslint/js";
import stylistic, { type RuleOptions as StylisticRuleOptions } from "@stylistic/eslint-plugin";

export default [
  { ignores: ["dist/**"] },
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
      "@stylistic/multiline-ternary": "off",
      "@stylistic/jsx-one-expression-per-line": "off",
      "@stylistic/jsx-closing-bracket-location": "off",
      "@stylistic/member-delimiter-style": ["error", {
        multiline: {
          delimiter: "semi",
          requireLast: true,
        },
        singleline: {
          delimiter: "semi",
          requireLast: false,
        },
        multilineDetection: "brackets",
      }],
    } satisfies { [K in keyof StylisticRuleOptions]?: Linter.RuleSeverity | [Linter.RuleSeverity, ...StylisticRuleOptions[K]]; },
  },
  {
    ...betterTailwindcss.configs.recommended,
    settings: {
      "better-tailwindcss": {
        entryPoint: "./src/global.css",
      },
    },
    rules: {
      ...betterTailwindcss.configs.recommended.rules,

      // Tailwind CSS
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "better-tailwindcss/no-unknown-classes": ["warn", { detectComponentClasses: true }],
    },
  },
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.config.ts"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "simple-import-sort": simpleImportSort,
      "unicorn": unicorn,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
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

      // Custom rule for @backend import
      "@typescript-eslint/no-restricted-imports": ["error", {
        paths: [{
          name: "@backend",
          message: "Use 'import type' for @backend imports. Runtime imports from backend are not allowed in frontend.",
          allowTypeImports: true,
        }],
        patterns: [{
          regex: "^@backend/",
          message: "Use 'import type' for @backend imports. Runtime imports from backend are not allowed in frontend.",
          allowTypeImports: true,
        }],
      }],
    },
  },
];

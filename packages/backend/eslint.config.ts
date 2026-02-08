import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

import eslint from "@eslint/js";

export default [
  { ignores: ["dist/**", "cdk.out/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
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
      "simple-import-sort": simpleImportSort,
      "unicorn": unicorn,
    },
    rules: {
      "quotes": ["error", "double", { avoidEscape: true }],
      "comma-spacing": ["error", { before: false, after: true }],
      "@typescript-eslint/no-unnecessary-condition": "error",
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

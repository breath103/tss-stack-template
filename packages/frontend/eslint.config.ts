import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

import eslint from "@eslint/js";

export default [
  { ignores: ["dist/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  betterTailwindcss.configs["recommended"],
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
      // Tailwind CSS
      "better-tailwindcss/enforce-consistent-line-wrapping": "off",
      "better-tailwindcss/enforce-consistent-class-order": ["warn", { entryPoint: "src/global.css" }],
      "better-tailwindcss/no-deprecated-classes": ["warn", { entryPoint: "src/global.css" }],
      "better-tailwindcss/enforce-shorthand-classes": ["warn", { entryPoint: "src/global.css" }],
      "better-tailwindcss/enforce-canonical-classes": ["warn", { entryPoint: "src/global.css" }],
    },
  },
];

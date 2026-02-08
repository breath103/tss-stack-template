import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unicorn from "eslint-plugin-unicorn";
import tseslint from "typescript-eslint";

import eslint from "@eslint/js";

export default [
  { ignores: ["dist/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
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
      "better-tailwindcss/enforce-consistent-line-wrapping": "off"      
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

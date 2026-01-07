import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "cdk.out/**"],
  },
  {
    rules: {
      "quotes": ["error", "double"],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

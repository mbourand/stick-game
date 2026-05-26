import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import jsoncParser from "jsonc-eslint-parser";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/out-tsc/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/test-output/**",
      "**/.turbo/**",
      "**/src/prisma/generated/**",
      "**/src/lib/zod.gen.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.cts", "**/*.mts", "**/*.js", "**/*.jsx", "**/*.cjs", "**/*.mjs"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.json", "**/*.jsonc"],
    languageOptions: {
      parser: jsoncParser,
    },
    rules: {
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-expressions": "off",
    },
  },
  prettierConfig,
];

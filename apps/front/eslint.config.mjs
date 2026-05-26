import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";
import js from "@eslint/js";
import { fixupConfigRules } from "@eslint/compat";
import baseConfig from "../../eslint.config.mjs";
import pluginQuery from "@tanstack/eslint-plugin-query";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
  recommendedConfig: js.configs.recommended,
});

export default [
  ...baseConfig,
  ...fixupConfigRules(compat.extends("next")),
  ...fixupConfigRules(compat.extends("next/core-web-vitals")),
  ...pluginQuery.configs["flat/recommended"],
  {
    ignores: [".next/**/*", "**/out-tsc"],
  },
];

import baseConfig from "../../eslint.config.mjs";
import pluginQuery from "@tanstack/eslint-plugin-query";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...baseConfig,
  reactHooks.configs.flat.recommended,
  ...pluginQuery.configs["flat/recommended"],
  {
    ignores: ["dist/**", "out-tsc/**"],
  },
];

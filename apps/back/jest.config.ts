import type { Config } from "jest";

const config: Config = {
  displayName: "@tau/back",
  testEnvironment: "node",
  transform: {
    "^.+\\.[tj]s$": [
      "@swc/jest",
      {
        sourceMaps: true,
        module: { type: "es6" },
        jsc: {
          target: "es2017",
          parser: { syntax: "typescript", decorators: true, dynamicImport: true },
          transform: { decoratorMetadata: true, legacyDecorator: true },
          keepClassNames: true,
          externalHelpers: true,
          loose: true,
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "js", "html"],
  testMatch: ["<rootDir>/src/**/*.spec.ts", "<rootDir>/src/**/*.test.ts"],
  coverageDirectory: "test-output/jest/coverage",
};

export default config;

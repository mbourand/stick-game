#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { createClient } from "@hey-api/openapi-ts";

const { values } = parseArgs({
  options: {
    input: { type: "string", short: "i" },
    output: { type: "string", short: "o" },
  },
  strict: true,
});

if (!values.input || !values.output) {
  console.error("Usage: generate-openapi-schemas --input <spec> --output <dir>");
  process.exit(1);
}

const input = resolve(process.cwd(), values.input);
const output = resolve(process.cwd(), values.output);

console.log(`Generating Zod schemas from ${input}...`);

if (!existsSync(input)) {
  console.error(`OpenAPI spec not found at ${input}`);
  process.exit(1);
}

try {
  await createClient({
    input,
    output,
    plugins: ["zod"],
  });
  console.log("Zod schemas generated successfully");
} catch (e) {
  console.error("Error generating schemas", e);
  process.exit(1);
}

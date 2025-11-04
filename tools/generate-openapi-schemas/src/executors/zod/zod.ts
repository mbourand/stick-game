import { PromiseExecutor } from "@nx/devkit";
import { ZodExecutorSchema } from "./schema";
import * as fs from "fs";
import { createClient } from "@hey-api/openapi-ts";

const runExecutor: PromiseExecutor<ZodExecutorSchema> = async (options) => {
  console.log(`🔄 Generating Zod schemas from ${options.specPath}...`);

  if (!fs.existsSync(options.specPath)) {
    console.error(`❌ OpenAPI spec not found at ${options.specPath}`);
    return { success: false };
  }

  try {
    await createClient({
      input: options.specPath,
      output: options.outputPath,
      plugins: ["zod"],
    });
    console.log("✅ Zod schemas generated successfully!");
    return { success: true };
  } catch (e) {
    console.error("Error generating schemas", e);
    return { success: false };
  }
};

export default runExecutor;

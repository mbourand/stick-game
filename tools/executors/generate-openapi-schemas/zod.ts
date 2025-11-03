import { ExecutorContext } from "@nx/devkit";
import { execSync } from "child_process";
import * as fs from "fs";

export default async function runExecutor(
  options: { specPath: string; outputPath: string },
  _context: ExecutorContext,
) {
  console.log(`🔄 Generating Zod schemas from ${options.specPath}...`);

  if (!fs.existsSync(options.specPath)) {
    console.error(`❌ OpenAPI spec not found at ${options.specPath}`);
    return { success: false };
  }

  try {
    execSync(`openapi-ts -i ${options.specPath} -o ${options.outputPath}`, { stdio: "inherit" });
    console.log("✅ Zod schemas generated successfully!");
    return { success: true };
  } catch (e) {
    console.error("Error generating schemas", e);
    return { success: false };
  }
}

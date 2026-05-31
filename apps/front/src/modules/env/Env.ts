import { z } from "zod";

// Runtime env injected by the container at startup (see public/env-config.js
// and the Docker entrypoint). Falls back to build-time import.meta.env so
// `vite dev` and local builds keep working off .env.
const runtimeEnv = (
  globalThis as typeof globalThis & {
    __ENV__?: Record<string, string | undefined>;
  }
).__ENV__;

const EnvSchema = z.object({
  BACKEND_URL: z.url(),
});

export const Env = EnvSchema.parse({
  BACKEND_URL: runtimeEnv?.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL,
});

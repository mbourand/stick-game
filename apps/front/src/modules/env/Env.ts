import { z } from "zod";

const EnvSchema = z.object({
  BACKEND_URL: z.url(),
});

export const Env = EnvSchema.parse({
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
});

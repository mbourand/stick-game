import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_BACKEND_URL: z.url(),
});

export const Env = EnvSchema.parse({
  NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL,
});

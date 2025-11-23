import z from "zod";

export const API_CONFIG_SCHEMA = z.object({
  AUTH_JWT_SECRET: z.string().min(1),
});

export const API_CONFIG: APIConfigType = API_CONFIG_SCHEMA.parse(process.env);

export type APIConfigType = z.infer<typeof API_CONFIG_SCHEMA>;

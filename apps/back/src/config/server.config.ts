import z from "zod";

export const SERVER_CONFIG_SCHEMA = z.object({
  PORT: z.coerce.number().min(1).max(65535),
  FRONTEND_ORIGIN: z.string(),
});

export const SERVER_CONFIG: ServerConfigType = SERVER_CONFIG_SCHEMA.parse(process.env);

export type ServerConfigType = z.infer<typeof SERVER_CONFIG_SCHEMA>;

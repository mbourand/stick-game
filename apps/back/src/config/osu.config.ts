import z from "zod";

export const OSU_CONFIG_SCHEMA = z.object({
  OSU_API_BASE_URL: z.url(),
  OSU_OAUTH_TOKEN_URL: z.url(),
  OSU_CLIENT_ID: z.string().min(1),
  OSU_CLIENT_SECRET: z.string().min(1),
});

export const OSU_CONFIG: OsuConfigType = OSU_CONFIG_SCHEMA.parse(process.env);

export type OsuConfigType = z.infer<typeof OSU_CONFIG_SCHEMA>;

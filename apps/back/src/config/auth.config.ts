import z from "zod";

/**
 * Auth/OAuth configuration. We delegate authentication entirely to OAuth
 * providers (Discord/Google) and never store passwords or PII — only a signed
 * JWT secret and each provider's app credentials.
 *
 * Provider credentials are optional: a provider is only offered to players once
 * both its id and secret are present, so the backend boots fine with one (or
 * zero) providers configured during local development.
 */
/** An optional credential: a blank value in `.env` is treated as "not set". */
const optionalCredential = z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional());

export const AUTH_CONFIG_SCHEMA = z.object({
  AUTH_JWT_SECRET: z.string().min(16),
  /** Public base URL of THIS backend, including the `/api` prefix. Used to build
   * the OAuth callback URLs the providers redirect back to. */
  AUTH_PUBLIC_BACKEND_URL: z.url(),

  DISCORD_CLIENT_ID: optionalCredential,
  DISCORD_CLIENT_SECRET: optionalCredential,

  GOOGLE_CLIENT_ID: optionalCredential,
  GOOGLE_CLIENT_SECRET: optionalCredential,
});

export const AUTH_CONFIG: AuthConfigType = AUTH_CONFIG_SCHEMA.parse(process.env);

export type AuthConfigType = z.infer<typeof AUTH_CONFIG_SCHEMA>;

/** How long an issued session token stays valid. */
export const JWT_EXPIRES_IN = "60d";

import { AUTH_CONFIG } from "../../config/auth.config";

/** A provider's opaque account key — the only identity we persist (no email/PII). */
export type OAuthProviderKey = "discord" | "google";

/** Normalised profile we extract from any provider's userinfo endpoint. */
export type OAuthProfile = {
  /** Stable, opaque per-provider account id. */
  providerId: string;
  /** A sensible default display name; the player can change it later. */
  username: string;
  /** Provider avatar URL, fetched once to seed the account avatar. */
  avatarUrl: string | null;
};

/** Everything needed to drive one provider's OAuth2 + profile flow. */
export type OAuthProviderConfig = {
  key: OAuthProviderKey;
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  authorizationURL: string;
  tokenURL: string;
  scope: string[];
  /** Fetch + normalise the provider profile given a granted access token. */
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
};

const callbackUrl = (key: OAuthProviderKey) => `${AUTH_CONFIG.AUTH_PUBLIC_BACKEND_URL}/auth/${key}/callback`;

const fetchJson = async (url: string, accessToken: string): Promise<Record<string, unknown>> => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Provider userinfo request failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as Record<string, unknown>;
};

/**
 * Build the config for every provider whose credentials are present. Providers
 * with missing id/secret are silently omitted so the app runs with any subset
 * configured.
 */
export const getEnabledProviders = (): OAuthProviderConfig[] => {
  const providers: OAuthProviderConfig[] = [];

  if (AUTH_CONFIG.DISCORD_CLIENT_ID && AUTH_CONFIG.DISCORD_CLIENT_SECRET) {
    providers.push({
      key: "discord",
      clientID: AUTH_CONFIG.DISCORD_CLIENT_ID,
      clientSecret: AUTH_CONFIG.DISCORD_CLIENT_SECRET,
      callbackURL: callbackUrl("discord"),
      authorizationURL: "https://discord.com/api/oauth2/authorize",
      tokenURL: "https://discord.com/api/oauth2/token",
      // `identify` only — no email, no guilds, nothing beyond the public profile.
      scope: ["identify"],
      fetchProfile: async (accessToken) => {
        const me = await fetchJson("https://discord.com/api/users/@me", accessToken);
        const id = String(me.id);
        const avatar = me.avatar as string | null;
        return {
          providerId: id,
          username: (me.global_name as string) || (me.username as string) || "Player",
          avatarUrl: avatar ? `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=256` : null,
        };
      },
    });
  }

  if (AUTH_CONFIG.GOOGLE_CLIENT_ID && AUTH_CONFIG.GOOGLE_CLIENT_SECRET) {
    providers.push({
      key: "google",
      clientID: AUTH_CONFIG.GOOGLE_CLIENT_ID,
      clientSecret: AUTH_CONFIG.GOOGLE_CLIENT_SECRET,
      callbackURL: callbackUrl("google"),
      authorizationURL: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenURL: "https://oauth2.googleapis.com/token",
      // `profile` gives name + picture without pulling in the user's email.
      scope: ["profile"],
      fetchProfile: async (accessToken) => {
        const me = await fetchJson("https://www.googleapis.com/oauth2/v3/userinfo", accessToken);
        return {
          providerId: String(me.sub),
          username: (me.name as string) || "Player",
          avatarUrl: (me.picture as string) ?? null,
        };
      },
    });
  }

  return providers;
};

export const ENABLED_PROVIDERS = getEnabledProviders();
export const ENABLED_PROVIDER_KEYS = ENABLED_PROVIDERS.map((p) => p.key);

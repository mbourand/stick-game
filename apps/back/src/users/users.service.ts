import { ConflictException, Injectable } from "@nestjs/common";
import { AUTH_CONFIG } from "../config/auth.config";
import { PrismaService } from "../prisma/prisma.service";
import { UserModel } from "../prisma/generated/client/models";
import { OAuthProfile, OAuthProviderKey } from "../auth/oauth/oauth-providers";
import { AvatarService } from "./avatar.service";

/** The provider account-id column backing each OAuth provider. */
const PROVIDER_ID_FIELD = {
  discord: "discordId",
  google: "googleId",
} as const satisfies Record<OAuthProviderKey, keyof UserModel>;

const MAX_USERNAME_LENGTH = 32;

/** True for a Prisma unique-constraint violation (P2002), optionally on a given field. */
const isUniqueViolation = (error: unknown, field?: string): boolean => {
  const e = error as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== "P2002") return false;
  if (!field) return true;
  const target = e.meta?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? "").includes(field);
};

/**
 * Absolute URL of an account's avatar. The `?v=` version (the account's
 * `updatedAt`) busts the long-cached avatar endpoint whenever it changes.
 * Shared by the profile and leaderboard responses so the URL shape lives once.
 */
export const buildAvatarUrl = (userId: string, version: number): string =>
  `${AUTH_CONFIG.AUTH_PUBLIC_BACKEND_URL}/users/${userId}/avatar?v=${version}`;

/** Account view safe to expose over the API — no provider ids, no avatar bytes. */
export type PublicProfile = {
  id: string;
  username: string;
  provider: OAuthProviderKey | null;
  avatarUrl: string | null;
  createdAt: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly avatars: AvatarService,
  ) {}

  findById(id: string): Promise<UserModel | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Resolve the account for an OAuth login: return the existing one linked to
   * this provider id, or create a fresh account (unique username + provider
   * avatar seeded best-effort).
   */
  async findOrCreateByProvider(provider: OAuthProviderKey, profile: OAuthProfile): Promise<UserModel> {
    const idField = PROVIDER_ID_FIELD[provider];
    const existing = await this.prisma.user.findFirst({ where: { [idField]: profile.providerId } });
    if (existing) return existing;

    const seededAvatar = profile.avatarUrl ? await this.avatars.fromUrl(profile.avatarUrl) : null;

    // Two concurrent first-logins (same provider account, or colliding usernames)
    // can both pass the lookup above and race on the unique constraints. Absorb
    // the loser's P2002 rather than 500ing the login: re-read the account if the
    // provider id was taken, or reallocate the username and retry.
    for (let attempt = 0; attempt < 5; attempt++) {
      const username = await this.allocateUsername(profile.username);
      try {
        return await this.prisma.user.create({
          data: {
            username,
            [idField]: profile.providerId,
            avatarData: seededAvatar?.data ?? null,
            avatarMime: seededAvatar?.mime ?? null,
          },
        });
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const raced = await this.prisma.user.findFirst({ where: { [idField]: profile.providerId } });
        if (raced) return raced;
        // Otherwise it was a username collision — loop and pick a fresh one.
      }
    }
    throw new ConflictException("Could not create account");
  }

  /** Rename an account, surfacing a 409 when the name is already taken. */
  async updateUsername(id: string, username: string): Promise<UserModel> {
    // Let the unique constraint be the arbiter (no check-then-write race): a
    // concurrent claim of the same name surfaces as P2002, which we map to 409.
    try {
      return await this.prisma.user.update({ where: { id }, data: { username } });
    } catch (error) {
      if (isUniqueViolation(error, "username")) throw new ConflictException("Username already taken");
      throw error;
    }
  }

  /** Process and store a new avatar from raw uploaded bytes. */
  async updateAvatar(id: string, input: Buffer): Promise<UserModel> {
    const { data, mime } = await this.avatars.process(input);
    return this.prisma.user.update({ where: { id }, data: { avatarData: data, avatarMime: mime } });
  }

  /** Raw avatar bytes for serving, or null if the account has none. */
  async getAvatar(id: string): Promise<{ data: Buffer; mime: string } | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { avatarData: true, avatarMime: true },
    });
    if (!user?.avatarData || !user.avatarMime) return null;
    return { data: Buffer.from(user.avatarData), mime: user.avatarMime };
  }

  toPublicProfile(user: UserModel): PublicProfile {
    // Derive the linked provider from the same field map used to look accounts
    // up, so adding a provider only touches PROVIDER_ID_FIELD.
    const provider =
      (Object.keys(PROVIDER_ID_FIELD) as OAuthProviderKey[]).find((key) => user[PROVIDER_ID_FIELD[key]] != null) ??
      null;
    return {
      id: user.id,
      username: user.username,
      provider,
      avatarUrl: user.avatarData ? buildAvatarUrl(user.id, user.updatedAt.getTime()) : null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * Find a free username from a provider-supplied base: trim to length, then
   * append a short numeric suffix on collision until one is free.
   */
  private async allocateUsername(base: string): Promise<string> {
    const root = base.trim().slice(0, MAX_USERNAME_LENGTH) || "Player";
    if (!(await this.usernameTaken(root))) return root;

    for (let attempt = 0; attempt < 50; attempt++) {
      const suffix = String(Math.floor(1000 + Math.random() * 9000));
      const candidate = `${root.slice(0, MAX_USERNAME_LENGTH - suffix.length - 1)}#${suffix}`;
      if (!(await this.usernameTaken(candidate))) return candidate;
    }
    // Astronomically unlikely fallback: a cuid-based name is guaranteed unique.
    return `Player#${Date.now().toString(36)}`;
  }

  private async usernameTaken(username: string): Promise<boolean> {
    return (await this.prisma.user.findUnique({ where: { username } })) !== null;
  }
}

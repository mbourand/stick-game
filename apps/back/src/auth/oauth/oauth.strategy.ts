import { Injectable, Type } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-oauth2";
import { UsersService } from "../../users/users.service";
import { CookieStateStore } from "./cookie-state-store";
import { OAuthProviderConfig } from "./oauth-providers";

/**
 * One generic passport-oauth2 strategy, specialised per provider by config.
 *
 * Each provider needs its own *named* passport strategy instance, so we mint a
 * class per provider via this factory rather than duplicating a near-identical
 * strategy file each time. All the shared work — exchanging the code for a
 * token (handled by passport-oauth2), fetching the normalised profile, and
 * upserting the account — lives here once.
 */
export const createOAuthStrategy = (provider: OAuthProviderConfig): Type => {
  @Injectable()
  class ProviderStrategy extends PassportStrategy(Strategy, provider.key) {
    constructor(private readonly users: UsersService) {
      super({
        authorizationURL: provider.authorizationURL,
        tokenURL: provider.tokenURL,
        clientID: provider.clientID,
        clientSecret: provider.clientSecret,
        callbackURL: provider.callbackURL,
        scope: provider.scope,
        // Sessionless CSRF protection: a custom state store round-trips a nonce
        // through an httpOnly cookie instead of express-session.
        store: new CookieStateStore(),
      });
    }

    /** Invoked by passport once the OAuth2 token exchange succeeds. */
    async validate(accessToken: string) {
      const profile = await provider.fetchProfile(accessToken);
      return this.users.findOrCreateByProvider(provider.key, profile);
    }
  }

  return ProviderStrategy;
};

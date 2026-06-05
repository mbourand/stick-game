import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { AUTH_CONFIG } from "../config/auth.config";
import { AuthUser, JwtPayload } from "./auth-user";

/**
 * Stateless bearer-token guard. Verifies the signed JWT and attaches the
 * identity to `request.user`. No DB hit and no server session — the token's
 * claims are enough for ownership checks; routes needing fresh profile data
 * load it themselves via UsersService.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(header.slice("Bearer ".length), {
        secret: AUTH_CONFIG.AUTH_JWT_SECRET,
      });
      request.user = { id: payload.sub, username: payload.username };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}

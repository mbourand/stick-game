import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** Identity carried in a session JWT and attached to authenticated requests. */
export type AuthUser = {
  id: string;
  username: string;
};

/** Claims we sign into the JWT. */
export type JwtPayload = {
  sub: string;
  username: string;
};

/** Pull the authenticated user (set by JwtAuthGuard) off the request. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
  return request.user;
});

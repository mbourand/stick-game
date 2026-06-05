import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request, Response } from "express";
import { SERVER_CONFIG } from "../config/server.config";
import { UserModel } from "../prisma/generated/client/models";
import { AuthService } from "./auth.service";
import { buildAuthCallbackHtml } from "./auth-callback.html";
import { ENABLED_PROVIDER_KEYS } from "./oauth/oauth-providers";

/**
 * OAuth login endpoints. For each enabled provider there are two routes:
 *   GET /auth/{provider}           — the guard redirects to the provider's consent screen
 *   GET /auth/{provider}/callback  — the guard exchanges the code; we then issue a token
 *
 * Both callbacks funnel through `completeLogin`, the single place that mints a
 * JWT and hands it back to the SPA popup.
 */
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Lets the frontend show only the providers that are actually configured. */
  @Get("providers")
  providers() {
    return { providers: ENABLED_PROVIDER_KEYS };
  }

  @Get("discord")
  @UseGuards(AuthGuard("discord"))
  discordLogin() {
    // The guard redirects to Discord; this body never runs.
  }

  @Get("discord/callback")
  @UseGuards(AuthGuard("discord"))
  discordCallback(@Req() req: Request, @Res() res: Response) {
    this.completeLogin(req, res);
  }

  @Get("google")
  @UseGuards(AuthGuard("google"))
  googleLogin() {
    // The guard redirects to Google; this body never runs.
  }

  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    this.completeLogin(req, res);
  }

  private completeLogin(req: Request, res: Response) {
    const token = this.auth.issueToken(req.user as UserModel);
    res.type("html").send(buildAuthCallbackHtml(token, SERVER_CONFIG.FRONTEND_ORIGIN));
  }
}

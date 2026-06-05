import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AUTH_CONFIG, JWT_EXPIRES_IN } from "../config/auth.config";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ENABLED_PROVIDERS } from "./oauth/oauth-providers";
import { createOAuthStrategy } from "./oauth/oauth.strategy";

// One passport strategy per configured provider, generated from its config.
const strategyProviders = ENABLED_PROVIDERS.map(createOAuthStrategy);

@Module({
  imports: [
    UsersModule,
    PassportModule,
    // Global so `@UseGuards(JwtAuthGuard)` works in any module without re-wiring.
    JwtModule.register({
      global: true,
      secret: AUTH_CONFIG.AUTH_JWT_SECRET,
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, ...strategyProviders],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}

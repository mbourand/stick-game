import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { LocalStrategy } from "./local.strategy";
import { PassportModule } from "@nestjs/passport";
import { API_CONFIG } from "../config/api.config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      global: true,
      secret: API_CONFIG.AUTH_JWT_SECRET,
      signOptions: { expiresIn: "7d" },
    }),
  ],
})
export class AuthModule {}

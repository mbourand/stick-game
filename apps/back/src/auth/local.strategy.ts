import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ passwordField: "password" });
  }

  async validate(username: string, password: string) {
    const user = await this.authService.validateUser(username, password);
    Logger.log(`Validating user: ${username}`);
    if (!user) {
      Logger.error(`Invalid credentials for user: ${username}`);
      throw new UnauthorizedException();
    }
    return user;
  }
}

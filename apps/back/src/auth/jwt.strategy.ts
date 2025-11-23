import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { API_CONFIG } from "../config/api.config";
import { JwtPayloadType } from "./dto/jwt.dto";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: API_CONFIG.AUTH_JWT_SECRET,
    });
  }

  async validate(payload: JwtPayloadType) {
    return { userId: payload.sub, username: payload.username };
  }
}

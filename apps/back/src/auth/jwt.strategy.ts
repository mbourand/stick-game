import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable } from "@nestjs/common";
import { API_CONFIG } from "../config/api.config";
import { JwtPayloadType } from "./dto/jwt.dto";
import { UsersService } from "../users/users.service";
import { RawUserType } from "../prisma/dto/user.dto";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: API_CONFIG.AUTH_JWT_SECRET,
    });
  }

  async validate(payload: JwtPayloadType): Promise<RawUserType | null> {
    const user = await this.usersService.findOne(payload.sub);
    return user;
  }
}

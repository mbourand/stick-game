import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserModel } from "../prisma/generated/client/models";
import { JwtPayload } from "./auth-user";

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  /** Sign a session token for a freshly authenticated account. */
  issueToken(user: UserModel): string {
    const payload: JwtPayload = { sub: user.id, username: user.username };
    return this.jwt.sign(payload);
  }
}

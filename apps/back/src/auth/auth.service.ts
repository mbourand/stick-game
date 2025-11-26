import { Injectable } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import bcrypt from "bcrypt";
import { UserModel } from "../prisma/generated/client/models";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async validateUser(username: string, pass: string) {
    const user = await this.usersService.findOneByUsername(username);
    if (user && bcrypt.compareSync(pass, user.hashedPassword)) {
      return user;
    }

    return null;
  }

  async login(user: UserModel) {
    const payload = { username: user.username, sub: user.id };
    return this.jwtService.sign(payload);
  }
}

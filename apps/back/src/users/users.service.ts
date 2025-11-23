import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UserCreateInput } from "../prisma/generated/client/models";
import bcrypt from "bcrypt";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async createUser(user: Pick<UserCreateInput, "username" | "email"> & { password: string }) {
    return this.prisma.user.create({
      data: {
        username: user.username,
        email: user.email,
        hashedPassword: bcrypt.hashSync(user.password, 10),
      },
    });
  }
}

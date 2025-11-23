import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ZodResponse } from "nestjs-zod";
import { PostAuthRegisterBodyDto, PostAuthRegisterResponseDto } from "./dto/post-auth-register.dto";
import { UsersService } from "../users/users.service";
import { toResponseUser } from "../prisma/dto/user.dto";
import { PostAuthLoginBodyDto, PostAuthLoginResponseDto } from "./dto/post-auth-login.dto";
import { type UserType } from "../prisma/generated/zod/schemas/models/User.schema";
import { Public } from "./public.decorator";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./local-auth.guard";
import { User } from "./user.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly usersService: UsersService) {}

  @Post("login")
  @Public()
  @UseGuards(LocalAuthGuard)
  @ZodResponse({ type: PostAuthLoginResponseDto })
  async login(@Body() _body: PostAuthLoginBodyDto, @User() user: UserType) {
    return { user: toResponseUser(user), token: await this.authService.login(user) };
  }

  @Post("register")
  @Public()
  @ZodResponse({ type: PostAuthRegisterResponseDto })
  async register(@Body() body: PostAuthRegisterBodyDto) {
    const user = await this.usersService.createUser({
      username: body.username,
      email: body.email,
      password: body.password,
    });

    const token = await this.authService.login(user);

    return { user: toResponseUser(user), token };
  }
}

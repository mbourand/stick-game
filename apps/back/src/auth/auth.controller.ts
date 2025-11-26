import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ZodResponse } from "nestjs-zod";
import { PostAuthRegisterBodyDto, PostAuthRegisterResponseDto } from "./dto/post-auth-register.dto";
import { UsersService } from "../users/users.service";
import { PostAuthLoginBodyDto, PostAuthLoginResponseDto } from "./dto/post-auth-login.dto";
import { Public } from "./public.decorator";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./local-auth.guard";
import { User } from "./user.decorator";
import { GetAuthMeResponseDto } from "./dto/get-auth-me.dto";
import { serializeUser } from "../prisma/dto/user.dto";
import { type UserModel } from "../prisma/generated/client/models";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly usersService: UsersService) {}

  @Post("login")
  @Public()
  @UseGuards(LocalAuthGuard)
  @ZodResponse({ type: PostAuthLoginResponseDto })
  async login(@Body() _body: PostAuthLoginBodyDto, @User() user: UserModel) {
    return { user: serializeUser(user), token: await this.authService.login(user) };
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

    return { user: serializeUser(user), token };
  }

  @Get("me")
  @ZodResponse({ type: GetAuthMeResponseDto })
  async me(@User() user: UserModel) {
    return { user: serializeUser(user) };
  }
}

import {
  Body,
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseFilePipe,
  Patch,
  Put,
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { ZodResponse } from "nestjs-zod";
import { AuthUser, CurrentUser } from "../auth/auth-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UsersService } from "./users.service";
import { UpdateUsernameDto, UserProfileDto } from "./dto/user-profile.dto";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** The slice of a multer upload we actually consume (avoids depending on the
 * fragile global `Express.Multer` namespace augmentation). */
type UploadedImage = { buffer: Buffer };

@Controller("users")
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Current account profile (fresh from the DB). */
  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ZodResponse({ type: UserProfileDto })
  async me(@CurrentUser() current: AuthUser) {
    return this.toProfileOrThrow(current.id);
  }

  /** Rename the current account. */
  @Patch("me/username")
  @UseGuards(JwtAuthGuard)
  @ZodResponse({ type: UserProfileDto })
  async updateUsername(@CurrentUser() current: AuthUser, @Body() body: UpdateUsernameDto) {
    const user = await this.users.updateUsername(current.id, body.username);
    return this.users.toPublicProfile(user);
  }

  /** Upload a new avatar (resized to a square webp server-side). */
  @Put("me/avatar")
  // Each upload runs sharp (CPU + memory); keep the per-IP rate well below the
  // global baseline so it can't be used to pin the server.
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @UseGuards(JwtAuthGuard)
  // `limits` makes multer abort mid-stream once the cap is hit, so a giant
  // upload can't exhaust memory before the size validator below ever runs.
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: MAX_AVATAR_BYTES } }))
  @ZodResponse({ type: UserProfileDto })
  async updateAvatar(
    @CurrentUser() current: AuthUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_AVATAR_BYTES }),
          new FileTypeValidator({ fileType: /^image\/(png|jpe?g|webp|gif)$/ }),
        ],
      }),
    )
    file: UploadedImage,
  ) {
    const user = await this.users.updateAvatar(current.id, file.buffer);
    return this.users.toPublicProfile(user);
  }

  /** Serve an account's avatar image. Public + long-cached (URL carries a version). */
  @Get(":id/avatar")
  async getAvatar(@Param("id") id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const avatar = await this.users.getAvatar(id);
    if (!avatar) throw new NotFoundException("No avatar");
    res.set({ "Content-Type": avatar.mime, "Cache-Control": "public, max-age=31536000, immutable" });
    return new StreamableFile(avatar.data);
  }

  private async toProfileOrThrow(id: string) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundException("Account not found");
    return this.users.toPublicProfile(user);
  }
}

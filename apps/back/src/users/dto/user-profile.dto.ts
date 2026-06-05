import { createZodDto } from "nestjs-zod";
import z from "zod";

/** Public account profile returned by the users + auth endpoints. */
export const UserProfileSchema = z.strictObject({
  id: z.string(),
  username: z.string().min(1).max(32),
  provider: z.enum(["discord", "google"]).nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const UpdateUsernameSchema = z.strictObject({
  username: z.string().min(1).max(32),
});

export class UserProfileDto extends createZodDto(UserProfileSchema) {}
export class UpdateUsernameDto extends createZodDto(UpdateUsernameSchema) {}

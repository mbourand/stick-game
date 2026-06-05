import { createZodDto } from "nestjs-zod";
import z from "zod";

/**
 * A user-chosen display name: trimmed, 1–32 chars, and free of control
 * characters (tabs, newlines, zero-width/format codes) so a name can't be blank,
 * padded with whitespace, or built to spoof another via invisible characters.
 * `\p{Cc}` is the Unicode "Control" category; `\p{Cf}` is "Format".
 */
const usernameField = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[^\p{Cc}\p{Cf}]+$/u, "Username contains disallowed characters");

/** Public account profile returned by the users + auth endpoints. */
export const UserProfileSchema = z.strictObject({
  id: z.string(),
  username: z.string().min(1).max(32),
  provider: z.enum(["discord", "google"]).nullable(),
  avatarUrl: z.string().nullable(),
  createdAt: z.iso.datetime(),
});

export const UpdateUsernameSchema = z.strictObject({
  username: usernameField,
});

export class UserProfileDto extends createZodDto(UserProfileSchema) {}
export class UpdateUsernameDto extends createZodDto(UpdateUsernameSchema) {}

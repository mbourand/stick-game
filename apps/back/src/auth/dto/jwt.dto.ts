import z from "zod";
import { UserSchema } from "../../prisma/generated/zod/schemas";
import { createZodDto } from "nestjs-zod";

const JwtPayloadSchema = z.strictObject({
  username: UserSchema.shape.username,
  sub: UserSchema.shape.id,
});

export class JwtPayloadDto extends createZodDto(JwtPayloadSchema) {}

export type JwtPayloadType = z.infer<typeof JwtPayloadSchema>;

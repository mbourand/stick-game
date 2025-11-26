import z from "zod";
import { SerializedUserSchema } from "../../prisma/dto/user.dto";
import { createZodDto } from "nestjs-zod";

const JwtPayloadSchema = z.strictObject({
  username: SerializedUserSchema.shape.username,
  sub: SerializedUserSchema.shape.id,
});

export class JwtPayloadDto extends createZodDto(JwtPayloadSchema) {}

export type JwtPayloadType = z.infer<typeof JwtPayloadSchema>;

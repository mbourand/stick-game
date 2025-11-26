import z from "zod";
import { createZodDto } from "nestjs-zod";
import { UserSchemas } from "../../prisma/dto/user.dto";

const JwtPayloadSchema = z.strictObject({
  username: UserSchemas.serialized.raw.shape.username,
  sub: UserSchemas.serialized.raw.shape.id,
});

export class JwtPayloadDto extends createZodDto(JwtPayloadSchema) {}

export type JwtPayloadType = z.infer<typeof JwtPayloadSchema>;

import { createZodDto } from "nestjs-zod";
import z from "zod";
import { UserSchemas } from "../../prisma/schemas/user.schemas";

const BodySchema = z.strictObject({
  username: z.string().min(3).max(30),
  email: z.email(),
  password: z.string().min(8).max(32),
});

const ResponseSchema = z.strictObject({
  user: UserSchemas.serialized.private(),
  token: z.jwt(),
});

export class PostAuthRegisterBodyDto extends createZodDto(BodySchema) {}
export class PostAuthRegisterResponseDto extends createZodDto(ResponseSchema) {}

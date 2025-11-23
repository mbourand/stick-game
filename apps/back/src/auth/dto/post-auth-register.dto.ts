import { createZodDto } from "nestjs-zod";
import z from "zod";
import { UserResponseDto } from "../../prisma/dto/user.dto";

const BodySchema = z.strictObject({
  username: z.string().min(3).max(30),
  email: z.email(),
  password: z.string().min(8).max(32),
});

const ResponseSchema = z.strictObject({
  user: UserResponseDto.schema,
  token: z.jwt(),
});

export class PostAuthRegisterBodyDto extends createZodDto(BodySchema) {}
export class PostAuthRegisterResponseDto extends createZodDto(ResponseSchema) {}

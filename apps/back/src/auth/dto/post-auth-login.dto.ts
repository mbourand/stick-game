import { createZodDto } from "nestjs-zod";
import z from "zod";
import { UserResponseDto } from "../../prisma/dto/user.dto";

const LoginBodySchema = z.strictObject({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const ResponseSchema = z.strictObject({
  user: UserResponseDto.schema,
  token: z.jwt(),
});

export class PostAuthLoginBodyDto extends createZodDto(LoginBodySchema) {}
export class PostAuthLoginResponseDto extends createZodDto(ResponseSchema) {}

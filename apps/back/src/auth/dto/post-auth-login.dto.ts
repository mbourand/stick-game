import { createZodDto } from "nestjs-zod";
import z from "zod";
import { UserSchemas } from "../../prisma/schemas/user.schemas";

const LoginBodySchema = z.strictObject({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const ResponseSchema = z.strictObject({
  user: UserSchemas.serialized.private,
  token: z.jwt(),
});

export class PostAuthLoginBodyDto extends createZodDto(LoginBodySchema) {}
export class PostAuthLoginResponseDto extends createZodDto(ResponseSchema) {}

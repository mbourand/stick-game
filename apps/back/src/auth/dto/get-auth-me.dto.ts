import { createZodDto } from "nestjs-zod";
import z from "zod";
import { UserSchemas } from "../../prisma/dto/user.dto";

const ResponseSchema = z.strictObject({ user: UserSchemas.serialized.private });

export class GetAuthMeResponseDto extends createZodDto(ResponseSchema) {}

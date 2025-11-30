import { createZodDto } from "nestjs-zod";
import z from "zod";
import { UserSchemas } from "../../prisma/schemas/user.schemas";

const ResponseSchema = z.strictObject({ user: UserSchemas.serialized.private() });

export class GetAuthMeResponseDto extends createZodDto(ResponseSchema) {}

import { createZodDto } from "nestjs-zod";
import { SerializedUserSchema } from "../../prisma/dto/user.dto";
import z from "zod";

const ResponseSchema = z.strictObject({ user: SerializedUserSchema });

export class GetAuthMeResponseDto extends createZodDto(ResponseSchema) {}

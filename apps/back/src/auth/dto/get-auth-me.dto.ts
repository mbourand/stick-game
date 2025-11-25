import { createZodDto } from "nestjs-zod";
import { UserResponseDto } from "../../prisma/dto/user.dto";
import z from "zod";

const ResponseSchema = z.strictObject({ user: UserResponseDto.schema });

export class GetAuthMeResponseDto extends createZodDto(ResponseSchema) {}

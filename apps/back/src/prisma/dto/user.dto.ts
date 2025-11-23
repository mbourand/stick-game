import { createZodDto } from "nestjs-zod";
import { UserSchema } from "../generated/zod/schemas";
import z from "zod";
import { UserType } from "../generated/zod/schemas/models/User.schema";

const UserResponseDtoSchema = UserSchema.extend({
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})
  .omit({ hashedPassword: true })
  .strict();

export const toResponseUser = (user: UserType): UserResponseType => {
  const cloned = structuredClone(user);
  delete (cloned as any).hashedPassword;

  return {
    ...cloned,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};

export class UserResponseDto extends createZodDto(UserResponseDtoSchema) {}

export type UserResponseType = z.infer<typeof UserResponseDtoSchema>;

import { zAuthControllerLoginResponse } from "@tau/back-schemas";
import z from "zod";

export type UserType = z.infer<typeof zAuthControllerLoginResponse.shape.user>;

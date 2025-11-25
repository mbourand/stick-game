import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { mutationOptions } from "@tanstack/react-query";

type AuthRegisterParams = {
  username: string;
  email: string;
  password: string;
};

const fetchRegister = async (params: AuthRegisterParams) => fetchBackend("/auth/register", { body: params });

export const authRegisterMutationOptions = () =>
  mutationOptions({
    mutationKey: ["auth", "register"],
    mutationFn: (params: AuthRegisterParams) => fetchRegister(params),
  });

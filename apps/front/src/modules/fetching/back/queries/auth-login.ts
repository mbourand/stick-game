import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { mutationOptions } from "@tanstack/react-query";

type AuthLoginParams = {
  username: string;
  password: string;
};

const fetchLogin = async (params: AuthLoginParams) => fetchBackend("/auth/login", { body: params });

export const authLoginMutationOptions = () =>
  mutationOptions({
    mutationKey: ["auth", "login"],
    mutationFn: (params: AuthLoginParams) => fetchLogin(params),
  });

import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { mutationOptions } from "@tanstack/react-query";

type AuthLoginParams = {
  username: string;
  password: string;
};

const fetchLogin = async (params: AuthLoginParams) => fetchBackend("/auth/login", { body: params });

export const authLoginMutationOptions = (params: AuthLoginParams) =>
  mutationOptions({
    mutationKey: ["auth", "login", params.username],
    mutationFn: () => fetchLogin(params),
  });

import { useAuthStore } from "@/modules/auth/store";
import { authLoginMutationOptions } from "@/modules/fetching/back/queries/auth-login";
import { useMutation } from "@tanstack/react-query";

export const useLogin = () => {
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    ...authLoginMutationOptions(),
    onSuccess: (data) => {
      setUser(data.user);
      localStorage.setItem("authToken", data.token);
    },
  });
};

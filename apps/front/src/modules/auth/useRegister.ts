import { authRegisterMutationOptions } from "@/modules/fetching/back/queries/auth-register";
import { useMutation } from "@tanstack/react-query";

export const useRegister = () => {
  return useMutation({
    ...authRegisterMutationOptions(),
    onSuccess: (data) => {
      localStorage.setItem("authToken", data.token);
    },
  });
};

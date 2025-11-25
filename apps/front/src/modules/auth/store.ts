import { UserType } from "@/modules/auth/types";
import { create } from "zustand";

type AuthStoreType = {
  user: UserType | null;
  setUser: (user: UserType | null) => void;
};

export const useAuthStore = create<AuthStoreType>()((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

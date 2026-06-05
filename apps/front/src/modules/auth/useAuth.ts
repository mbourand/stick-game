import { useStore } from "@/modules/game/engine/state/useStore";
import { authStore } from "./authStore";

/** The active session (or null), reactive to login/logout. */
export const useAuth = () => useStore(authStore);

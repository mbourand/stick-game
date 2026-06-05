import { Store } from "@/modules/game/engine/state/Store";
import { zUserProfile } from "@tau/back-schemas";
import z from "zod";

/** A logged-in account profile (mirrors the backend `UserProfile`). */
export type Account = z.infer<typeof zUserProfile>;

/** The active session: a signed token plus the cached account it belongs to. */
export type AuthSession = {
  token: string;
  user: Account;
};

const STORAGE_KEY = "tau-auth";

const loadFromStorage = (): AuthSession | null => {
  if (typeof localStorage === "undefined") return null;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as { token?: unknown; user?: unknown };
    if (typeof parsed.token !== "string") return null;
    const user = zUserProfile.safeParse(parsed.user);
    if (!user.success) return null;
    return { token: parsed.token, user: user.data };
  } catch {
    return null;
  }
};

/**
 * The single source of truth for the player's session. Persisted to
 * localStorage so a refresh keeps you logged in; `useStore(authStore)` lets the
 * UI react to login/logout. The cached `user` is a convenience snapshot —
 * `refreshAccount()` re-fetches it from the backend on boot.
 */
export const authStore = new Store<AuthSession | null>(loadFromStorage());

const persist = (session: AuthSession | null) => {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private-mode failures
  }
};

/** Replace the whole session (after login). */
export const setSession = (session: AuthSession | null) => {
  authStore.set(session);
  persist(session);
};

/** Patch just the cached account (after a profile edit), keeping the token. */
export const setAccount = (user: Account) => {
  const current = authStore.get();
  if (!current) return;
  setSession({ token: current.token, user });
};

/** Drop the session (logout). */
export const clearSession = () => setSession(null);

/** Bearer token for the active session, or null when logged out. */
export const getAuthToken = (): string | null => authStore.get()?.token ?? null;

export const isLoggedIn = (): boolean => authStore.get() !== null;

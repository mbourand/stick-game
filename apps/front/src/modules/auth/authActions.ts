import { Env } from "@/modules/env/Env";
import { browserQueryClient } from "@/components/QueryProvider";
import { fetchBackend } from "@/modules/fetching/back/fetchBackend";
import { zUserProfile } from "@tau/back-schemas";
import { Account, authStore, clearSession, setAccount, setSession } from "./authStore";

export type OAuthProvider = "discord" | "google";

const backendOrigin = new URL(Env.BACKEND_URL).origin;

/**
 * Leaderboards render the account's *live* name/avatar (joined server-side), but
 * the lists are cached by React Query. Drop those caches after a profile edit so
 * the next view refetches with the updated identity instead of a stale snapshot.
 */
const invalidateLeaderboards = () => browserQueryClient?.invalidateQueries({ queryKey: ["scores"] });

/** Fetch the profile for a token that isn't in the store yet (during login). */
const fetchAccountWithToken = (token: string): Promise<Account> =>
  fetchBackend("/users/me", { headers: { Authorization: `Bearer ${token}` } });

/** Which providers the backend actually has configured. */
export const fetchAvailableProviders = async (): Promise<OAuthProvider[]> => {
  const { providers } = await fetchBackend("/auth/providers", {});
  return providers;
};

/**
 * Run the OAuth flow in a popup. The backend callback posts the session token
 * back to us via `postMessage`; we then load the profile and store the session.
 * Resolves once logged in, rejects if the popup is blocked or closed first.
 */
export const loginWithProvider = (provider: OAuthProvider): Promise<void> =>
  new Promise((resolve, reject) => {
    const popup = window.open(`${Env.BACKEND_URL}/auth/${provider}`, "tau-oauth", "width=520,height=720");
    if (!popup) {
      reject(new Error("Could not open the login window (popup blocked?)"));
      return;
    }

    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      clearInterval(closedTimer);
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== backendOrigin) return;
      const data = event.data as { type?: string; token?: string } | null;
      if (data?.type !== "tau-auth" || typeof data.token !== "string") return;
      cleanup();
      const token = data.token;
      fetchAccountWithToken(token)
        .then((user) => {
          setSession({ token, user });
          popup.close();
          resolve();
        })
        .catch(reject);
    };

    window.addEventListener("message", onMessage);
    // The provider flow opened a popup; if the player closes it, abandon the wait.
    const closedTimer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error("Login was cancelled"));
      }
    }, 500);
  });

export const logout = () => clearSession();

/**
 * Re-fetch the current account on boot to pick up server-side changes (and drop
 * the session if the token has expired/been revoked).
 */
export const refreshAccount = async (): Promise<void> => {
  if (!authStore.get()) return;
  try {
    setAccount(await fetchBackend("/users/me", {}));
  } catch {
    clearSession();
  }
};

/** Rename the logged-in account. */
export const updateUsername = async (username: string): Promise<void> => {
  setAccount(await fetchBackend("/users/me/username", { body: { username } }));
  void invalidateLeaderboards();
};

/** Upload a new avatar image (multipart — bypasses the JSON fetch layer). */
export const uploadAvatar = async (file: File): Promise<void> => {
  const session = authStore.get();
  if (!session) throw new Error("Not logged in");

  const form = new FormData();
  form.append("file", file);

  const response = await fetch(`${Env.BACKEND_URL}/users/me/avatar`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${session.token}` },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Avatar upload failed: ${response.status} ${response.statusText}`);
  }

  setAccount(zUserProfile.parse(await response.json()));
  void invalidateLeaderboards();
};

/**
 * One-time pickup of a token left in the URL fragment by the same-tab OAuth
 * fallback (when the popup had no opener). Call once on boot.
 */
export const consumeRedirectToken = async (): Promise<void> => {
  const match = window.location.hash.match(/tau-auth-token=([^&]+)/);
  if (!match) return;
  const token = decodeURIComponent(match[1]);
  history.replaceState(null, "", window.location.pathname + window.location.search);
  try {
    setSession({ token, user: await fetchAccountWithToken(token) });
  } catch {
    clearSession();
  }
};

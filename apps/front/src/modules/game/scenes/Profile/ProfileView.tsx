import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/modules/auth/useAuth";
import {
  fetchAvailableProviders,
  loginWithProvider,
  logout,
  type OAuthProvider,
  updateUsername,
  uploadAvatar,
} from "@/modules/auth/authActions";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useViewport } from "../../engine/state/useViewport";
import { HintBar } from "../shared/KeyHint";
import type { SceneUIComponent } from "../Scene";
import type { ProfileScene } from "./ProfileScene";

const PROVIDER_META: Record<OAuthProvider, { label: string; className: string }> = {
  discord: { label: "Continue with Discord", className: "bg-[#5865F2] hover:bg-[#4752c4] text-white" },
  google: { label: "Continue with Google", className: "bg-white hover:bg-white/90 text-gray-900" },
};

export const ProfileView: SceneUIComponent<ProfileScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));
  const hintMotion = useScenePresenceMotion(fade({ y: 12 }));
  const { scale } = useViewport();
  const session = useAuth();

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="w-[460px] flex flex-col text-white p-7 rounded border border-white/10 bg-white/[0.02]"
          {...panelMotion}
        >
          <header className="mb-6">
            <h2 className="text-2xl tracking-[0.35em] uppercase">Account</h2>
          </header>

          {session ? <LoggedIn /> : <LoggedOut />}
        </motion.div>

        <motion.button
          type="button"
          onClick={() => scene.close()}
          className="mt-7 flex items-center gap-5 text-[11px] text-white/40 tracking-[0.35em] uppercase pointer-events-auto hover:text-white/70 transition-colors"
          {...hintMotion}
        >
          <HintBar items={[{ key: "B", label: "Back" }]} />
        </motion.button>
      </div>
    </motion.div>
  );
};

const LoggedOut = () => {
  const [providers, setProviders] = useState<OAuthProvider[] | null>(null);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableProviders()
      .then(setProviders)
      .catch(() => setError("Couldn't reach the server"));
  }, []);

  const signIn = async (provider: OAuthProvider) => {
    setError(null);
    setBusy(provider);
    try {
      await loginWithProvider(provider);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 pointer-events-auto">
      <p className="text-xs text-white/55 tracking-wide leading-relaxed -mt-2">
        Sign in to save your scores to the global leaderboards. We only store your username and avatar — no password,
        no email.
      </p>

      {providers === null ? (
        <p className="text-center text-xs text-white/40 tracking-[0.2em] uppercase py-4">Loading…</p>
      ) : providers.length === 0 ? (
        <p className="text-center text-xs text-white/40 tracking-[0.2em] uppercase py-4">No sign-in options available</p>
      ) : (
        providers.map((provider) => (
          <button
            key={provider}
            type="button"
            disabled={busy !== null}
            onClick={() => signIn(provider)}
            className={`h-12 rounded-md font-semibold text-sm tracking-wide transition-colors disabled:opacity-60 ${PROVIDER_META[provider].className}`}
          >
            {busy === provider ? "Opening…" : PROVIDER_META[provider].label}
          </button>
        ))
      )}

      {error && <p className="text-center text-xs text-red-400/90 tracking-wide">{error}</p>}
    </div>
  );
};

const LoggedIn = () => {
  const session = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) return null;
  const { user } = session;

  const startEditing = () => {
    setDraft(user.username);
    setError(null);
    setEditing(true);
  };

  const saveName = async () => {
    const name = draft.trim();
    if (!name || name === user.username) {
      setEditing(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateUsername(name);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save name");
    } finally {
      setBusy(false);
    }
  };

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await uploadAvatar(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5 pointer-events-auto">
      <div className="relative">
        <Avatar src={user.avatarUrl} name={user.username} size={96} />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInput.current?.click()}
          className="absolute -bottom-1 -right-1 h-8 px-2 rounded-full bg-white/15 border border-white/30 text-[10px] tracking-wider uppercase text-white/80 hover:bg-white/25 transition-colors disabled:opacity-60"
        >
          Edit
        </button>
        <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
      </div>

      {editing ? (
        <div className="flex flex-col items-center gap-2 w-full">
          <input
            autoFocus
            value={draft}
            maxLength={32}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void saveName();
              if (e.key === "Escape") setEditing(false);
            }}
            className="w-full h-10 px-3 rounded-md bg-white/10 border border-white/30 text-center text-lg text-white outline-none focus:border-white/70"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveName()}
              className="h-8 px-4 rounded-md bg-white/15 border border-white/30 text-xs tracking-wider uppercase hover:bg-white/25 disabled:opacity-60"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-8 px-4 rounded-md border border-white/15 text-xs tracking-wider uppercase text-white/60 hover:text-white/90"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="text-2xl tracking-[0.15em] uppercase hover:text-white/80 transition-colors"
          title="Change username"
        >
          {user.username}
        </button>
      )}

      {user.provider && (
        <p className="text-[10px] text-white/35 tracking-[0.3em] uppercase">via {user.provider}</p>
      )}

      {error && <p className="text-center text-xs text-red-400/90 tracking-wide">{error}</p>}

      <button
        type="button"
        onClick={logout}
        className="mt-2 h-10 px-6 rounded-md border border-white/15 text-xs tracking-[0.2em] uppercase text-white/60 hover:text-white/90 hover:border-white/30 transition-colors"
      >
        Sign out
      </button>
    </div>
  );
};

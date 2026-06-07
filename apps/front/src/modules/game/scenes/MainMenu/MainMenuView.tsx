import { AnimatePresence, motion } from "motion/react";
import { settings } from "@/modules/settings/Settings";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/modules/auth/useAuth";
import { useScenePresence } from "../../engine/animation/scenePresence";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { KeyHint } from "../shared/KeyHint";
import type { SceneUIComponent } from "../Scene";
import { DailyTeaserCard } from "./DailyTeaserCard";
import {
  BUTTONS,
  getButtonYOffsetFromCenter,
  JUKEBOX_BUTTON_GAP_PX,
  JUKEBOX_BUTTON_SIZE_PX,
  JUKEBOX_CONTROLS,
  type JukeboxControl,
  JUKEBOX_LABEL_Y_FROM_CENTER,
  JUKEBOX_ROW_Y_FROM_CENTER,
  MAIN_MENU_CIRCLE_RADIUS,
} from "./layout";
import type { MainMenuScene } from "./MainMenuScene";
import { RadialButton } from "./RadialButton";

const CIRCLE_DIAMETER = MAIN_MENU_CIRCLE_RADIUS * 2;

const PROVIDER_LABEL: Record<string, string> = { discord: "Discord", google: "Google" };

export const MainMenuView: SceneUIComponent<MainMenuScene> = ({ scene }) => {
  const focused = useStore(scene.focused);
  const dailyFocused = useStore(scene.dailyFocused);
  const jukeboxFocus = useStore(scene.jukeboxFocus);
  const nowPlayingTrack = useStore(scene.player.currentTrack);
  const paused = useStore(scene.player.pausedStore);
  const { scale } = useViewport();
  const isVisible = useScenePresence() === "in";
  const session = useAuth();

  // Logged-in account drives the card; otherwise fall back to the guest name.
  const displayName = session?.user.username ?? settings.get().playerName ?? "Guest";

  // The account button is "Sign In" for a guest, "Profile" once logged in.
  const account = session
    ? { label: "Profile", hint: "Manage your account" }
    : { label: "Sign In", hint: "Sign in or manage your account" };

  // Nothing focused → the player hasn't started navigating yet. We use this to
  // surface the "move a stick" coach over the (now-unobstructed) aim dots, and
  // to swap the footer between a control legend and the focused item's blurb.
  const idle = focused === null && !dailyFocused && jukeboxFocus === null;

  const hint = dailyFocused
    ? "Jump straight into today's daily challenge"
    : focused === "account"
      ? account.hint
      : focused
        ? BUTTONS.find((b) => b.id === focused)?.hint
        : null;

  const profileMotion = useScenePresenceMotion(fade({ y: -8 }));

  return (
    <div className="absolute inset-0 text-white select-none" style={{ fontFamily: "Rostex" }}>
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: `${CIRCLE_DIAMETER}px`,
          height: `${CIRCLE_DIAMETER}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <DailyTeaserCard scene={scene} isFocused={dailyFocused} />

        {BUTTONS.map((button, i) => {
          const yCenter = MAIN_MENU_CIRCLE_RADIUS + getButtonYOffsetFromCenter(i);
          const label = button.id === "account" ? account.label : button.label;

          return (
            <RadialButton
              key={button.id}
              index={i}
              label={label}
              yCenter={yCenter}
              isFocused={focused === button.id}
              onFocus={() => {
                scene.dailyFocused.set(false);
                scene.focused.set(button.id);
              }}
              onBlur={() => {
                if (scene.focused.get() === button.id) scene.focused.set(null);
              }}
              onClick={() => scene.activateFocused(button.id)}
            />
          );
        })}

        {/* Profile summary — docked to the upper arc so it no longer covers the
            centre, where the stick-aim dots live. */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center text-center"
          style={{ top: 52 }}
          {...profileMotion}
        >
          <button
            type="button"
            onClick={() => scene.openProfile()}
            className="flex flex-col items-center pointer-events-auto group focus:outline-none"
            title={session ? "Manage your account" : "Sign in"}
          >
            <Avatar
              src={session?.user.avatarUrl}
              name={displayName}
              size={84}
              className="mb-3 transition-transform duration-150 group-hover:scale-105 group-focus:scale-105"
            />
            <div className="text-2xl tracking-[0.15em] uppercase">{displayName}</div>

            {session ? (
              <ProfileMeta provider={session.user.provider} createdAt={session.user.createdAt} />
            ) : (
              <div className="text-xs text-white/45 tracking-[0.2em] uppercase mt-2">Sign in to save your scores</div>
            )}
          </button>
        </motion.div>

        {/* Aim-hub coach: framed halo + caption around the live stick dots, shown
            only while idle so first-timers learn the dots follow their stick.
            The ring is hollow, so it frames the dots rather than hiding them. */}
        <AnimatePresence>
          {isVisible && idle && (
            <motion.div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <motion.div
                className="rounded-full border border-white/20"
                style={{ width: 78, height: 78 }}
                animate={{ scale: [1, 1.14, 1], opacity: [0.55, 0.2, 0.55] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="absolute top-full mt-4 text-[11px] text-white/45 tracking-[0.28em] uppercase whitespace-nowrap">
                Move a stick to aim
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer: the focused item's blurb while navigating, a control legend
            while idle. */}
        <div className="absolute bottom-[18%] left-0 right-0 px-[14%] h-6 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            {isVisible && hint ? (
              <motion.div
                key={hint}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="text-xs text-white/60 italic tracking-wide"
              >
                {hint}
              </motion.div>
            ) : isVisible && idle ? (
              <motion.div
                key="legend"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-5 text-[11px] text-white/40 tracking-[0.25em] uppercase"
              >
                <span>
                  <KeyHint label="↑↓" /> Navigate
                </span>
                <span className="text-white/15">|</span>
                <span>
                  <KeyHint label="A" /> Select
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Jukebox — now-playing label + transport controls, positioned by design
            coords so the stick (whose dot renders at stick·radius) can hover them.
            Hidden when nothing's playing, so the menu looks untouched. */}
        <AnimatePresence>
          {isVisible && nowPlayingTrack && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="absolute left-0 right-0 -translate-y-1/2 flex justify-center"
                style={{ top: MAIN_MENU_CIRCLE_RADIUS + JUKEBOX_LABEL_Y_FROM_CENTER }}
              >
                <span className="max-w-150 truncate text-sm text-white/75 tracking-wide">
                  ♪ {nowPlayingTrack.artist} – {nowPlayingTrack.title}
                </span>
              </div>
              <div
                className="absolute left-0 right-0 -translate-y-1/2 flex items-center justify-center"
                style={{ top: MAIN_MENU_CIRCLE_RADIUS + JUKEBOX_ROW_Y_FROM_CENTER, gap: JUKEBOX_BUTTON_GAP_PX }}
              >
                {JUKEBOX_CONTROLS.map((control, i) => (
                  <button
                    key={control}
                    type="button"
                    title={control === "pause" ? (paused ? "Play" : "Pause") : control}
                    onClick={() => activateControl(scene, control)}
                    onMouseEnter={() => scene.jukeboxFocus.set(i)}
                    onMouseLeave={() => scene.jukeboxFocus.set(null)}
                    style={{ width: JUKEBOX_BUTTON_SIZE_PX, height: JUKEBOX_BUTTON_SIZE_PX }}
                    className={`pointer-events-auto flex items-center justify-center rounded-full border text-xl transition-colors ${
                      jukeboxFocus === i
                        ? "bg-white/25 border-white/60 text-white"
                        : "bg-white/10 border-white/30 text-white/70 hover:bg-white/20"
                    }`}
                  >
                    {control === "previous" ? "⏮" : control === "skip" ? "⏭" : paused ? "▶" : "⏸"}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/** Run the jukebox transport action a control maps to. */
const activateControl = (scene: MainMenuScene, control: JukeboxControl) => {
  if (control === "previous") scene.player.previous();
  else if (control === "skip") scene.player.skip();
  else scene.player.togglePause();
};

/** The "via Discord · since Jun 2026" identity line under a logged-in player's name. */
const ProfileMeta = ({ provider, createdAt }: { provider: string | null; createdAt: string }) => {
  const memberSince = new Date(createdAt).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-white/50 tracking-[0.2em] uppercase">
      {provider && <span>via {PROVIDER_LABEL[provider] ?? provider}</span>}
      {provider && <span className="text-white/20">·</span>}
      <span>since {memberSince}</span>
    </div>
  );
};

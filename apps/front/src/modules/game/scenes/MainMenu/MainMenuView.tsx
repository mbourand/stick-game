import { AnimatePresence, motion } from "motion/react";
import { settings } from "@/modules/settings/Settings";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/modules/auth/useAuth";
import { useScenePresence } from "../../engine/animation/scenePresence";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../utils/constants";
import type { SceneUIComponent } from "../Scene";
import { BUTTONS, getButtonYOffsetFromCenter } from "./layout";
import type { MainMenuScene } from "./MainMenuScene";
import { RadialButton } from "./RadialButton";

const CIRCLE_DIAMETER = GAME_CIRCLE_DISPLAYED_RADIUS * 2;

export const MainMenuView: SceneUIComponent<MainMenuScene> = ({ scene }) => {
  const focused = useStore(scene.focused);
  const { scale } = useViewport();
  const isVisible = useScenePresence() === "in";
  const session = useAuth();

  // Logged-in account drives the card; otherwise fall back to the guest name.
  const displayName = session?.user.username ?? settings.get().playerName ?? "Guest";
  const hint = focused ? BUTTONS.find((b) => b.id === focused)?.hint : null;

  const playerCardMotion = useScenePresenceMotion(fade());

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
        {BUTTONS.map((button, i) => {
          const yCenter = GAME_CIRCLE_DISPLAYED_RADIUS + getButtonYOffsetFromCenter(i);

          return (
            <RadialButton
              key={button.id}
              index={i}
              label={button.label}
              yCenter={yCenter}
              isFocused={focused === button.id}
              onFocus={() => scene.focused.set(button.id)}
              onBlur={() => {
                if (scene.focused.get() === button.id) scene.focused.set(null);
              }}
              onClick={() => scene.activateFocused(button.id)}
            />
          );
        })}

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
          {...playerCardMotion}
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
              size={128}
              className="mb-6 transition-transform duration-150 group-hover:scale-105 group-focus:scale-105"
            />
            <div className="text-3xl tracking-[0.15em] uppercase">{displayName}</div>
            <div className="text-sm text-white/50 tracking-[0.25em] uppercase mt-2">
              {session ? "View profile" : "Sign in"}
            </div>
          </button>
        </motion.div>

        <div className="absolute bottom-[18%] left-0 right-0 px-[14%] h-5 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            {isVisible && hint && (
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
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

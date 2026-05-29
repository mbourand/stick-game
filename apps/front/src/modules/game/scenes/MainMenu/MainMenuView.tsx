"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { settings } from "@/modules/settings/Settings";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../utils/constants";
import type { SceneUIComponent } from "../Scene";
import { useScenePhase } from "../useScene";
import { BUTTONS, getButtonYOffsetFromCenter, PHASE_DURATION_S } from "./layout";
import type { MainMenuScene } from "./MainMenuScene";
import { RadialButton } from "./RadialButton";

const CIRCLE_DIAMETER = GAME_CIRCLE_DISPLAYED_RADIUS * 2;

export const MainMenuView: SceneUIComponent = ({ scene }) => {
  const mainMenuScene = scene as MainMenuScene;
  const focused = useSyncExternalStore(
    mainMenuScene.subscribe,
    mainMenuScene.getFocused,
    mainMenuScene.getFocused,
  );
  const phase = useScenePhase(scene);
  const isVisible = phase === "active" || phase === "entering";

  const playerName = settings.get().playerName || "Guest";
  const hint = focused ? BUTTONS.find((b) => b.id === focused)?.hint : null;

  return (
    <div className="absolute inset-0 text-white select-none" style={{ fontFamily: "Rostex" }}>
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: `${CIRCLE_DIAMETER}px`,
          height: `${CIRCLE_DIAMETER}px`,
          transform: "translate(-50%, -50%)",
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
              isVisible={isVisible}
              onFocus={() => mainMenuScene.setFocused(button.id)}
              onBlur={() => {
                if (mainMenuScene.getFocused() === button.id) mainMenuScene.setFocused(null);
              }}
              onClick={() => mainMenuScene.activateFocused(button.id)}
            />
          );
        })}

        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: PHASE_DURATION_S, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="w-32 h-32 rounded-full bg-white/10 border border-white/20 mb-6" />
          <div className="text-3xl tracking-[0.15em] uppercase">{playerName}</div>
          <div className="text-sm text-white/50 tracking-[0.25em] uppercase mt-2">rank #—</div>
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

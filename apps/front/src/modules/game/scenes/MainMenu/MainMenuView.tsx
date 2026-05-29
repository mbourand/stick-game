"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { settings } from "@/modules/settings/Settings";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../utils/constants";
import type { SceneUIComponent } from "../Scene";
import { computeRadialButtonLayout } from "../shared/radialButton";
import { useScenePhase } from "../useScene";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_RETRACT_X,
  BUTTON_WIDTH_PX,
  BUTTONS,
  getButtonYOffsetFromCenter,
  OUTER_LEFT_EXTRA_PX,
} from "./layout";
import type { MainMenuScene } from "./MainMenuScene";

const CIRCLE_DIAMETER = GAME_CIRCLE_DISPLAYED_RADIUS * 2;
const BUTTON_STAGGER_S = 0.04;
const PHASE_DURATION_S = 0.32;

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

const RadialButton = ({
  index,
  label,
  yCenter,
  isFocused,
  isVisible,
  onFocus,
  onBlur,
  onClick,
}: {
  index: number;
  label: string;
  yCenter: number;
  isFocused: boolean;
  isVisible: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
}) => {
  const r = GAME_CIRCLE_DISPLAYED_RADIUS;

  // Caller passes parent-relative yCenter; helper expects circle-centre-relative.
  const { top, left, outerWidth, mask, paddingNear: paddingLeft } = computeRadialButtonLayout({
    side: "right",
    yCenter: yCenter - r,
    radius: r,
    buttonW: BUTTON_WIDTH_PX,
    buttonH: BUTTON_HEIGHT_PX,
    outerExtraPx: OUTER_LEFT_EXTRA_PX,
    minNearPaddingPx: 24,
  });

  return (
    <div
      className="absolute"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${outerWidth}px`,
        height: `${BUTTON_HEIGHT_PX}px`,
        maskImage: mask,
        WebkitMaskImage: mask,
        maskComposite: "intersect",
      }}
    >
      <motion.button
        type="button"
        className={`absolute pointer-events-auto text-white text-xl font-bold uppercase tracking-[0.3em] rounded-r-full flex items-center justify-between transition-colors ${
          isFocused ? "bg-white/25" : "bg-white/10"
        }`}
        style={{
          right: 0,
          top: 0,
          width: `${BUTTON_WIDTH_PX}px`,
          height: `${BUTTON_HEIGHT_PX}px`,
          paddingLeft: `${paddingLeft}px`,
          paddingRight: "44px",
          border: "2px solid rgba(255,255,255,0.5)",
        }}
        initial={false}
        animate={{
          x: isVisible ? 0 : BUTTON_RETRACT_X,
          opacity: isVisible ? 1 : 0,
        }}
        transition={{
          duration: PHASE_DURATION_S,
          ease: [0.4, 0, 0.2, 1],
          delay: isVisible ? index * BUTTON_STAGGER_S : 0,
        }}
        onMouseEnter={onFocus}
        onMouseLeave={onBlur}
        onFocus={onFocus}
        onBlur={onBlur}
        onClick={onClick}
      >
        <span>{label}</span>
        <span className="w-7 h-7 rounded-full border border-white/40" aria-hidden />
      </motion.button>
    </div>
  );
};

"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Settings } from "@/modules/settings/Settings";
import { GAME_CIRCLE_DISPLAYED_RADIUS, GAME_CIRCLE_STROKE_WIDTH } from "../../utils/constants";
import type { SceneUIComponent } from "../Scene";
import { BUTTON_HEIGHT_PX, BUTTON_WIDTH_PX, BUTTONS, getButtonYOffsetFromCenter } from "./layout";
import type { MainMenuScene } from "./MainMenuScene";

const CIRCLE_DIAMETER = GAME_CIRCLE_DISPLAYED_RADIUS * 2;

export const MainMenuView: SceneUIComponent = ({ scene }) => {
  const mainMenuScene = scene as MainMenuScene;
  const focused = useSyncExternalStore(
    mainMenuScene.subscribe,
    mainMenuScene.getFocused,
    mainMenuScene.getFocused,
  );

  const playerName = Settings.getSettings().playerName || "Guest";
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
              label={button.label}
              yCenter={yCenter}
              isFocused={focused === button.id}
              onFocus={() => mainMenuScene.setFocused(button.id)}
              onBlur={() => {
                if (mainMenuScene.getFocused() === button.id) mainMenuScene.setFocused(null);
              }}
              onClick={() => mainMenuScene.activate(button.id)}
            />
          );
        })}

        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `${GAME_CIRCLE_STROKE_WIDTH}px solid white`,
            backgroundColor: "transparent",
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <div className="w-32 h-32 rounded-full bg-white/10 border border-white/20 mb-6" />
          <div className="text-3xl tracking-[0.15em] uppercase">{playerName}</div>
          <div className="text-sm text-white/50 tracking-[0.25em] uppercase mt-2">rank #—</div>
        </div>

        <div className="absolute bottom-[18%] left-0 right-0 px-[14%] h-5 flex items-center justify-center pointer-events-none">
          <AnimatePresence mode="wait">
            {hint && (
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
  label,
  yCenter,
  isFocused,
  onFocus,
  onBlur,
  onClick,
}: {
  label: string;
  yCenter: number;
  isFocused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  onClick: () => void;
}) => {
  const r = GAME_CIRCLE_DISPLAYED_RADIUS;

  const farY = Math.abs(yCenter - r) + BUTTON_HEIGHT_PX / 2;
  const buttonLeftX = r + Math.sqrt(Math.max(0, r * r - farY * farY));
  const buttonTopY = yCenter - BUTTON_HEIGHT_PX / 2;

  const maskCenterX = r - buttonLeftX;
  const maskCenterY = r - buttonTopY;
  const maskValue = `radial-gradient(circle at ${maskCenterX}px ${maskCenterY}px, transparent ${r - 0.5}px, black ${r + 0.5}px)`;

  const yClosestToMaskY = Math.max(0, Math.min(BUTTON_HEIGHT_PX, maskCenterY));
  const yDelta = yClosestToMaskY - maskCenterY;
  const maxHiddenX = maskCenterX + Math.sqrt(Math.max(0, r * r - yDelta * yDelta));
  const paddingLeft = Math.max(24, maxHiddenX + 24);

  return (
    <button
      type="button"
      className={`absolute pointer-events-auto text-white text-xl font-bold uppercase tracking-[0.3em] rounded-r-full flex items-center justify-between transition-colors ${
        isFocused ? "bg-white/25" : "bg-white/10"
      }`}
      style={{
        left: `${buttonLeftX}px`,
        top: `${buttonTopY}px`,
        width: `${BUTTON_WIDTH_PX}px`,
        height: `${BUTTON_HEIGHT_PX}px`,
        paddingLeft: `${paddingLeft}px`,
        paddingRight: "44px",
        maskImage: maskValue,
        WebkitMaskImage: maskValue,
        border: "2px solid rgba(255,255,255,0.5)",
      }}
      onMouseEnter={onFocus}
      onMouseLeave={onBlur}
      onFocus={onFocus}
      onBlur={onBlur}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="w-7 h-7 rounded-full border border-white/40" aria-hidden />
    </button>
  );
};

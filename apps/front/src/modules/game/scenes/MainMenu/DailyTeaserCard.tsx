import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { dailyQueryOptions, type DailyBeatmapset } from "@/modules/fetching/back/queries/daily";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { difficultyColor, difficultyColorRgba } from "../shared/difficultyColor";
import { computeRadialButtonLayout } from "../shared/radialButtonLayout";
import { BUTTON_HEIGHT_PX, BUTTON_WIDTH_PX, MAIN_MENU_CIRCLE_RADIUS, OUTER_LEFT_EXTRA_PX } from "./layout";
import type { MainMenuScene } from "./MainMenuScene";

type DailyTeaserCardProps = {
  scene: MainMenuScene;
  /** True when stick / d-pad / mouse focus is on this card. */
  isFocused: boolean;
};

/**
 * Left-curve teaser for today's daily challenge. Mirrors the menu's right-side
 * radial buttons geometry-wise (same curve mask + retract), but carries cover
 * art + a live countdown. Clicking jumps into BeatmapSelection with the daily
 * flow auto-armed — the actual download/scope logic stays in BeatmapSelection's
 * DailyPanel; this is purely a teaser, with no install state of its own.
 */
export const DailyTeaserCard = ({ scene, isFocused }: DailyTeaserCardProps) => {
  const { data } = useQuery(dailyQueryOptions());

  // Let the scene know whether the card is actually on screen, so the controller
  // never focuses a card that hasn't loaded (and focus clears if it disappears).
  useEffect(() => {
    scene.dailyAvailable.set(Boolean(data));
    return () => scene.dailyAvailable.set(false);
  }, [scene, data]);

  // Hooks above stay unconditional; the data-dependent body lives in a child.
  if (!data) return null;
  return <DailyCard scene={scene} isFocused={isFocused} daily={data} />;
};

const DailyCard = ({
  scene,
  isFocused,
  daily,
}: DailyTeaserCardProps & { daily: DailyBeatmapset }) => {
  const countdown = useCountdownToUtcMidnight();

  const layout = computeRadialButtonLayout({
    side: "left",
    yCenter: 0, // vertically centred on the curve, like the profile card it sits beside
    radius: MAIN_MENU_CIRCLE_RADIUS,
    buttonW: BUTTON_WIDTH_PX,
    buttonH: BUTTON_HEIGHT_PX,
    outerExtraPx: OUTER_LEFT_EXTRA_PX,
    minNearPaddingPx: 24,
  });

  // Retract toward the curve (rightward, for a left-side button) on scene exit.
  const retractX = layout.outerWidth - BUTTON_WIDTH_PX;
  const presence = useScenePresenceMotion(fade({ x: retractX }));

  const easyColor = difficultyColor(daily.starRange.min);
  const hardColor = difficultyColor(daily.starRange.max);

  return (
    <motion.div
      className="absolute top-0 left-0"
      style={{
        x: layout.left,
        y: layout.top,
        width: layout.outerWidth,
        height: BUTTON_HEIGHT_PX,
        maskImage: layout.mask,
        WebkitMaskImage: layout.mask,
        maskComposite: "intersect",
      }}
    >
      <motion.button
        type="button"
        onClick={() => scene.goToDailyChallenge()}
        onMouseEnter={() => {
          scene.focused.set(null);
          scene.dailyFocused.set(true);
        }}
        onMouseLeave={() => scene.dailyFocused.set(false)}
        className={`group absolute left-0 top-0 flex items-center justify-end overflow-hidden rounded-l-full text-right pointer-events-auto transition-colors ${
          isFocused ? "bg-black/55" : "bg-black/70"
        }`}
        style={{
          width: BUTTON_WIDTH_PX,
          height: BUTTON_HEIGHT_PX,
          paddingLeft: 44,
          paddingRight: layout.paddingNear,
          border: `2px solid ${isFocused ? hardColor : difficultyColorRgba(daily.starRange.max, 0.6)}`,
        }}
        {...presence}
      >
        {/* Cover-art backdrop + scrim (darkest on the text side). */}
        {daily.coverUrl !== "" && (
          <img
            src={daily.coverUrl}
            alt=""
            draggable={false}
            className={`absolute inset-0 h-full w-full object-cover opacity-40 transition-transform duration-500 group-hover:scale-105 ${
              isFocused ? "scale-105" : ""
            }`}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-l from-black/95 via-black/75 to-black/30" />

        {/* Shimmer sweep */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)",
          }}
          animate={{ x: ["-130%", "130%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
        />

        {/* Content (right-aligned, clear of the curve via paddingRight). */}
        <div className="relative flex max-w-75 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.28em]">
            <motion.span
              style={{ color: hardColor }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              ★
            </motion.span>
            <span className="text-white/90">Daily challenge</span>
          </div>

          <div className="max-w-full truncate text-base font-semibold tracking-[0.04em] text-white">
            {daily.title}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-bold tabular-nums">
            <span style={{ color: easyColor }}>{daily.starRange.min.toFixed(1)}★</span>
            <span
              className="h-px w-16"
              style={{ background: `linear-gradient(to right, ${easyColor}, ${hardColor})` }}
            />
            <span style={{ color: hardColor }}>{daily.starRange.max.toFixed(1)}★</span>
          </div>

          <div className="mt-0.5 flex items-center gap-2">
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em]"
              style={{ color: hardColor }}
            >
              ▶ Play today
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-white/40 tabular-nums">
              {countdown}
            </span>
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
};

/** "HH:MM:SS" until the next UTC midnight, ticking each second. */
function useCountdownToUtcMidnight(): string {
  const [, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const now = new Date();
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  const remaining = Math.max(0, next - now.getTime());
  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (v: number) => v.toString().padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

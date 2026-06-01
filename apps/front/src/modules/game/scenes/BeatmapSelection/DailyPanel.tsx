import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { dailyQueryOptions, type DailyBeatmapset } from "@/modules/fetching/back/queries/daily";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { getInstallStatusStore, startBeatmapsetInstall, type InstallStatus } from "../Downloader/beatmapInstallStore";
import { difficultyColor, difficultyColorRgba } from "../shared/difficultyColor";
import type { BeatmapSelectionScene } from "./BeatmapSelectionScene";
import {
  BUTTON_HEIGHT_PX,
  BUTTON_WIDTH_PX,
  CIRCLE_EDGE_RADIUS_PX,
  CIRCLE_RADIUS_PX,
  computeLeftRadialLayout,
} from "./layout";

const idv2Of = (beatmapId: number) => `osu_${beatmapId}`;

/** Padding around the glow layer so its blur blooms outward without an edge crop. */
const GLOW_PAD_PX = 32;

/**
 * Mask that clips an absolutely-positioned layer to the circle's EXTERIOR, so
 * nothing crosses into the ring (keeps the interior clean). `originX/Y` is the
 * layer's top-left in circle-box coords (its translate x/y). Fully transparent
 * up to the ring's outer edge, with a 1px feather just outside for AA — so even
 * a bright 2px border never leaks inside.
 */
const circleExteriorMask = (originX: number, originY: number): string => {
  const cx = CIRCLE_RADIUS_PX - originX;
  const cy = CIRCLE_RADIUS_PX - originY;
  return `radial-gradient(circle at ${cx}px ${cy}px, transparent ${CIRCLE_EDGE_RADIUS_PX}px, black ${CIRCLE_EDGE_RADIUS_PX + 1}px)`;
};

type DailyPanelProps = {
  scene: BeatmapSelectionScene;
  /** This button's slot in scene.leftActions — set on click so focus lands here. */
  index: number;
  /** Vertical centre on the curve, from getLeftButtonYCenter — shared with the action buttons. */
  yCenter: number;
  /** True when the gamepad/stick/d-pad focus is on this button. */
  isFocused: boolean;
  /** idv2 keys currently installed — used to tell "owned" from "needs download". */
  installedIdv2s: ReadonlySet<string>;
  /** The active daily scope (from the scene), so the button reflects on/off state. */
  scopeActive: boolean;
};

export const DailyPanel = (props: DailyPanelProps) => {
  const { data } = useQuery(dailyQueryOptions());
  // Hooks must stay stably ordered, so the data-dependent button lives in a child.
  if (!data) return null;
  return <DailyRadialButton {...props} daily={data} />;
};

const DailyRadialButton = ({
  scene,
  index,
  yCenter,
  isFocused,
  daily,
  installedIdv2s,
  scopeActive,
}: DailyPanelProps & { daily: DailyBeatmapset }) => {
  const keys = useMemo(() => daily.beatmapIds.map(idv2Of), [daily.beatmapIds]);
  const owned = useMemo(() => keys.some((k) => installedIdv2s.has(k)), [keys, installedIdv2s]);

  const status = useStore(getInstallStatusStore(daily.beatmapsetId));
  const countdown = useCountdownToUtcMidnight();

  // After a click-triggered install lands, flip the list into daily scope. A
  // ref (not state) tracks the pending intent so the completion effect doesn't
  // call setState — it just reacts to the install store's phase changing.
  const awaitingInstall = useRef(false);
  useEffect(() => {
    if (awaitingInstall.current && status.phase === "done") {
      awaitingInstall.current = false;
      scene.activateDailyScope(keys);
    }
  }, [status.phase, keys, scene]);

  // The action itself — shared by mouse click and gamepad confirm.
  const runAction = useCallback(() => {
    if (scopeActive) {
      scene.clearDailyScope();
      return;
    }
    if (owned) {
      scene.activateDailyScope(keys);
      return;
    }
    awaitingInstall.current = true;
    startBeatmapsetInstall(daily.beatmapsetId);
  }, [scene, scopeActive, owned, keys, daily.beatmapsetId]);

  // Register the action so the scene's confirm/gamepad path runs the same thing.
  useEffect(() => {
    scene.setDailyActivate(runAction);
    return () => scene.setDailyActivate(null);
  }, [scene, runAction]);

  const onClick = () => {
    scene.focusedLeftButton.set(index);
    runAction();
  };

  const layout = computeLeftRadialLayout(yCenter, CIRCLE_RADIUS_PX);

  // Retract toward the curve on scene exit, exactly like the other left buttons.
  const retractX = layout.outerWidth - BUTTON_WIDTH_PX;
  const presence = useScenePresenceMotion(fade({ x: retractX }));

  const easyColor = difficultyColor(daily.starRange.min);
  const hardColor = difficultyColor(daily.starRange.max);
  const accentGradient = `linear-gradient(120deg, ${easyColor}, ${hardColor}, ${easyColor})`;

  const buttonMask = circleExteriorMask(layout.left, layout.top);
  const glowMask = circleExteriorMask(layout.left - GLOW_PAD_PX, layout.top - GLOW_PAD_PX);

  return (
    <>
      {/* Soft accent glow. Clipped to the circle EXTERIOR (interior stays clean)
          but on a layer padded by GLOW_PAD_PX, so the blur blooms freely on the
          outer sides without an edge crop. Nested layers keep position /
          presence-retract / breathing from colliding on `x`. */}
      <motion.div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          x: layout.left - GLOW_PAD_PX,
          y: layout.top - GLOW_PAD_PX,
          width: BUTTON_WIDTH_PX + GLOW_PAD_PX * 2,
          height: BUTTON_HEIGHT_PX + GLOW_PAD_PX * 4,
          maskImage: glowMask,
          WebkitMaskImage: glowMask,
        }}
      >
        <motion.div className="absolute inset-0" {...presence}>
          <motion.div
            className="absolute rounded-l-full blur-xl"
            style={{
              top: GLOW_PAD_PX,
              left: GLOW_PAD_PX,
              width: BUTTON_WIDTH_PX,
              height: BUTTON_HEIGHT_PX,
              background: accentGradient,
            }}
            animate={{
              opacity: isFocused ? [0.3, 0.5, 0.3] : [0.22, 0.3, 0.22],
              scale: [0.9, 1, 0.9],
            }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>

      {/* Button — clipped to the circle exterior so neither its body nor its
          border ever crosses into the ring. */}
      <motion.div
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          x: layout.left,
          y: layout.top,
          width: layout.outerWidth,
          height: BUTTON_HEIGHT_PX,
          maskImage: buttonMask,
          WebkitMaskImage: buttonMask,
        }}
      >
        <motion.div
          className="absolute top-0 left-0"
          style={{ width: BUTTON_WIDTH_PX, height: BUTTON_HEIGHT_PX }}
          {...presence}
        >
          <button
            type="button"
            onClick={onClick}
            className={`group absolute inset-0 flex items-center justify-end overflow-hidden rounded-l-full text-right pointer-events-auto transition-colors ${
              isFocused ? "bg-black/55" : "bg-black/70"
            }`}
            style={{
              paddingLeft: 32,
              paddingRight: layout.paddingRight,
              // Focus emphasis lives on the (uncropped) glow layer + border, since
              // a box-shadow here would be clipped by the exterior mask.
              border: `2px solid ${isFocused ? hardColor : difficultyColorRgba(daily.starRange.max, 0.6)}`,
            }}
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
            <div className="absolute inset-0 bg-linear-to-l from-black/95 via-black/75 to-black/35" />

            {/* Shimmer sweep */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.28) 50%, transparent 60%)",
              }}
              animate={{ x: ["-130%", "130%"] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.6 }}
            />

            {/* Content (right-aligned, clear of the curve via paddingRight). */}
            <div className="relative flex max-w-96 flex-col items-end gap-0.5">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.28em]">
                <motion.span
                  style={{ color: hardColor }}
                  animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  ★
                </motion.span>
                <span className="text-white/90">Daily map</span>
              </div>

              <div className="max-w-full truncate text-sm font-semibold tracking-[0.04em] text-white">
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

              <DailyStatusLine
                scopeActive={scopeActive}
                owned={owned}
                status={status}
                accent={hardColor}
                countdown={countdown}
              />
            </div>
          </button>
        </motion.div>
      </motion.div>
    </>
  );
};

const DailyStatusLine = ({
  scopeActive,
  owned,
  status,
  accent,
  countdown,
}: {
  scopeActive: boolean;
  owned: boolean;
  status: InstallStatus;
  accent: string;
  countdown: string;
}) => {
  if (status.phase === "downloading" || status.phase === "installing") {
    const pct =
      status.phase === "downloading"
        ? status.totalBytes
          ? (status.receivedBytes / status.totalBytes) * 100
          : null
        : (status.completed / Math.max(1, status.total)) * 100;
    return (
      <div className="mt-0.5 flex w-32 items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.2em] text-white/70">
          {status.phase === "downloading" ? "Getting" : "Installing"}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
          {pct === null ? (
            <motion.div
              className="h-full w-1/3 rounded-full"
              style={{ background: accent }}
              animate={{ x: ["-100%", "300%"] }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            <motion.div
              className="h-full rounded-full"
              style={{ background: accent }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
          )}
        </div>
      </div>
    );
  }

  let label: string;
  if (scopeActive) label = "Showing today ✕";
  else if (status.phase === "error") label = "Retry download";
  else if (owned) label = "▶ Play the daily";
  else label = "⬇ Get today's map";

  return (
    <div className="mt-0.5 flex items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
        {label}
      </span>
      <span className="text-[9px] uppercase tracking-[0.18em] text-white/40 tabular-nums">{countdown}</span>
    </div>
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

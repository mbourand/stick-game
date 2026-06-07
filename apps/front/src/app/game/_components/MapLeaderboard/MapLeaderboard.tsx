import { LeaderboardGlobalScores } from "@/app/game/_components/MapLeaderboard/LeaderboardGlobalScores";
import { LeaderboardLocalScores } from "@/app/game/_components/MapLeaderboard/LeaderboardLocalScores";
import { KeyHint } from "@/modules/game/scenes/shared/KeyHint";
import { twMerge } from "tailwind-merge";

export type LeaderboardTab = "global" | "modded" | "local";

/** Bumper cycle order across the three leaderboards. */
export const LEADERBOARD_TABS: readonly LeaderboardTab[] = ["global", "modded", "local"];

/** Step to the next/previous leaderboard tab, wrapping around the ends. */
export const cycleLeaderboardTab = (current: LeaderboardTab, dir: -1 | 1): LeaderboardTab => {
  const next = (LEADERBOARD_TABS.indexOf(current) + dir + LEADERBOARD_TABS.length) % LEADERBOARD_TABS.length;
  return LEADERBOARD_TABS[next];
};

const TAB_LABEL: Record<LeaderboardTab, string> = {
  global: "Top 5",
  modded: "Modded",
  local: "Your scores",
};

type MapLeaderboardProps = {
  beatmapId: string;
  tab: LeaderboardTab;
  className?: string;
  /** Dim the "X Refresh" hint while a refresh is on cooldown. */
  refreshCoolingDown?: boolean;
};

export const MapLeaderboard = ({ beatmapId, tab, className, refreshCoolingDown = false }: MapLeaderboardProps) => {
  return (
    <div className={twMerge("text-white", className)}>
      <div className="flex items-center justify-center gap-4 mb-3">
        <BumperHint label="L" />
        <h2 className="text-sm tracking-[0.3em] uppercase text-white/80">{TAB_LABEL[tab]}</h2>
        <BumperHint label="R" />
      </div>
      <div className="bg-black/30 backdrop-blur-sm rounded px-4 py-3">
        {tab === "local" ? (
          <LeaderboardLocalScores beatmapId={beatmapId} />
        ) : (
          <LeaderboardGlobalScores beatmapId={beatmapId} modded={tab === "modded"} />
        )}
      </div>
      <div className="mt-2 flex items-center justify-center gap-4 text-[10px] tracking-[0.25em] uppercase text-white/40">
        <span>
          <KeyHint label="Y" /> Full leaderboard
        </span>
        <span className={refreshCoolingDown ? "opacity-40" : undefined}>
          <KeyHint label="X" /> Refresh
        </span>
      </div>
    </div>
  );
};

const BumperHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-7 h-6 px-2 rounded border border-white/40 text-xs font-bold tracking-wider text-white/80"
    aria-hidden
  >
    {label}
  </span>
);

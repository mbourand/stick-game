import { LeaderboardGlobalScores } from "@/app/game/_components/MapLeaderboard/LeaderboardGlobalScores";
import { LeaderboardLocalScores } from "@/app/game/_components/MapLeaderboard/LeaderboardLocalScores";
import { twMerge } from "tailwind-merge";

export type LeaderboardTab = "global" | "local";

const TAB_LABEL: Record<LeaderboardTab, string> = {
  global: "Top 5",
  local: "Your scores",
};

type MapLeaderboardProps = {
  beatmapId: string;
  tab: LeaderboardTab;
  className?: string;
};

export const MapLeaderboard = ({ beatmapId, tab, className }: MapLeaderboardProps) => {
  return (
    <div className={twMerge("text-white", className)}>
      <div className="flex items-center justify-center gap-4 mb-3">
        <BumperHint label="L" />
        <h2 className="text-sm tracking-[0.3em] uppercase text-white/80">{TAB_LABEL[tab]}</h2>
        <BumperHint label="R" />
      </div>
      <div className="bg-black/30 backdrop-blur-sm rounded px-4 py-3">
        {tab === "global" ? (
          <LeaderboardGlobalScores beatmapId={beatmapId} />
        ) : (
          <LeaderboardLocalScores beatmapId={beatmapId} />
        )}
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

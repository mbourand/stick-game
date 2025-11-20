import { LeaderboardGlobalScores } from "@/app/game/_components/MapLeaderboard/LeaderboardGlobalScores";
import { LeaderboardLocalScores } from "@/app/game/_components/MapLeaderboard/LeaderboardLocalScores";
import { ReactNode, useState } from "react";
import { twMerge } from "tailwind-merge";

enum LeaderboardType {
  Global = "Global",
  Local = "Local",
}

type LeaderboardConfigType = {
  title: string;
  renderScores: (props: ScoreDisplayerProps) => ReactNode;
};

type ScoreDisplayerProps = {
  beatmapId: string;
  scoreVersion: number;
};

const LEADERBOARD_CONFIG = {
  [LeaderboardType.Global]: {
    title: "Top 50",
    renderScores: (props: ScoreDisplayerProps) => <LeaderboardGlobalScores {...props} />,
  },
  [LeaderboardType.Local]: {
    title: "Your scores",
    renderScores: (props: ScoreDisplayerProps) => <LeaderboardLocalScores {...props} />,
  },
} as const satisfies Record<LeaderboardType, LeaderboardConfigType>;

export const MapLeaderboard = ({ beatmapId, className }: { beatmapId: string; className?: string }) => {
  const [leaderboardType, setLeaderboardType] = useState(LeaderboardType.Global);
  const [scoreVersion, setScoreVersion] = useState(3);

  return (
    <>
      <div className={twMerge(`text-white bg-white/10 w-[250px]`, className)}>
        <div className="flex w-full">
          {Object.values(LeaderboardType).map((type) => (
            <button
              key={type}
              className={twMerge(
                "w-full py-1 px-2",
                leaderboardType === type ? "bg-white/20" : "bg-white/10 hover:bg-white/20",
              )}
              onClick={() => setLeaderboardType(type)}
            >
              {type}
            </button>
          ))}
        </div>
        <div className="p-6 pt-4 relative">
          <select
            className="absolute right-2 top-2 bg-white/10 px-1"
            name="scoreVersion"
            defaultValue={3}
            onChange={(e) => setScoreVersion(Number(e.target.value))}
          >
            <option className="text-black" value={1}>
              v1
            </option>
            <option className="text-black" value={2}>
              v2
            </option>
            <option className="text-black" value={3}>
              v3
            </option>
          </select>
          <h1 className="text-center font-semibold text-lg mb-2">{LEADERBOARD_CONFIG[leaderboardType].title}</h1>
          {LEADERBOARD_CONFIG[leaderboardType].renderScores({ beatmapId, scoreVersion })}
        </div>
      </div>
    </>
  );
};

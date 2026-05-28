import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { useQuery } from "@tanstack/react-query";
import { ScoreRow } from "./ScoreRow";

const LATEST_SCORE_VERSION = 3;
const VISIBLE_ROWS = 5;

type LeaderboardGlobalScoresProps = {
  beatmapId: string;
};

export const LeaderboardGlobalScores = ({ beatmapId }: LeaderboardGlobalScoresProps) => {
  const leaderboardQuery = useQuery(
    scoresBeatmapLeaderboardQueryOptions(beatmapId, LATEST_SCORE_VERSION),
  );

  if (leaderboardQuery.isLoading) return <Status text="Loading…" />;
  if (leaderboardQuery.isError) return <Status text="Failed to load" />;
  const entries = leaderboardQuery.data?.leaderboard ?? [];
  if (entries.length === 0) return <Status text="No scores yet" />;

  return (
    <ol className="flex flex-col gap-1">
      {entries.slice(0, VISIBLE_ROWS).map((entry, index) => (
        <ScoreRow
          key={entry.playerName + index}
          rank={index + 1}
          playerName={entry.playerName}
          score={entry.score}
          accuracy={entry.accuracy}
          maxCombo={entry.maxCombo}
        />
      ))}
    </ol>
  );
};

const Status = ({ text }: { text: string }) => (
  <div className="text-center text-xs text-white/50 tracking-[0.2em] uppercase py-3">{text}</div>
);

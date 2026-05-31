import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";
import { useQuery } from "@tanstack/react-query";
import { ScoreRow } from "./ScoreRow";

const VISIBLE_ROWS = 5;

type LeaderboardLocalScoresProps = {
  beatmapId: string;
};

export const LeaderboardLocalScores = ({ beatmapId }: LeaderboardLocalScoresProps) => {
  const leaderboardQuery = useQuery(
    localScoresBeatmapLeaderboardQueryOptions(beatmapId, LATEST_SCORE_VERSION),
  );

  if (leaderboardQuery.isLoading) return <Status text="Loading…" />;
  if (leaderboardQuery.isError) return <Status text="Failed to load" />;
  const entries = leaderboardQuery.data ?? [];
  if (entries.length === 0) return <Status text="No scores yet" />;

  return (
    <ol className="flex flex-col gap-1">
      {entries.slice(0, VISIBLE_ROWS).map((entry, index) => (
        <ScoreRow
          key={entry.submissionTime.getTime()}
          rank={index + 1}
          playerName={entry.playerName}
          score={entry.score}
          accuracy={entry.accuracy}
          maxCombo={entry.maxCombo}
          missCount={entry.missCount}
        />
      ))}
    </ol>
  );
};

const Status = ({ text }: { text: string }) => (
  <div className="text-center text-xs text-white/50 tracking-[0.2em] uppercase py-3">{text}</div>
);

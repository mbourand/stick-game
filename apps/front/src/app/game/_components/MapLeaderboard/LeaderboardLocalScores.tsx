import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { useQuery } from "@tanstack/react-query";

type LeaderboardLocalScoresProps = {
  beatmapId: string;
  scoreVersion: number;
};

export const LeaderboardLocalScores = ({ beatmapId, scoreVersion }: LeaderboardLocalScoresProps) => {
  const leaderboardQuery = useQuery(localScoresBeatmapLeaderboardQueryOptions(beatmapId, scoreVersion));

  return (
    <>
      {leaderboardQuery.isLoading && <p>Loading leaderboard...</p>}
      {leaderboardQuery.isError && <p>Error loading leaderboard</p>}
      {leaderboardQuery.data && leaderboardQuery.data.length === 0 && <p>No scores yet</p>}
      {leaderboardQuery.data && leaderboardQuery.data.length > 0 && (
        <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto">
          {leaderboardQuery.data.map((entry, index) => (
            <p key={entry.submissionTime.getTime()}>
              {index + 1}. {entry.playerName} -{" "}
              {entry.score
                .toString()
                .split("")
                .flatMap((c, i, a) => (i && (a.length - i) % 3 === 0 ? [" ", c] : [c]))
                .join("")}
              <br />
              {entry.accuracy.toFixed(2)}% - {entry.maxCombo}x
            </p>
          ))}
        </div>
      )}
    </>
  );
};

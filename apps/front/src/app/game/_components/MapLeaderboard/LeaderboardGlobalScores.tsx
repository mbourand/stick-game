import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { useQuery } from "@tanstack/react-query";

type LeaderboardGlobalScoresProps = {
  beatmapId: string;
  scoreVersion: number;
};

export const LeaderboardGlobalScores = ({ beatmapId, scoreVersion }: LeaderboardGlobalScoresProps) => {
  const leaderboardQuery = useQuery(scoresBeatmapLeaderboardQueryOptions(beatmapId, scoreVersion));

  return (
    <>
      {leaderboardQuery.isLoading && <p>Loading leaderboard...</p>}
      {leaderboardQuery.isError && <p>Error loading leaderboard</p>}
      {leaderboardQuery.data && leaderboardQuery.data.leaderboard.length === 0 && <p>No scores yet</p>}
      {leaderboardQuery.data && leaderboardQuery.data.leaderboard.length > 0 && (
        <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto">
          {leaderboardQuery.data.leaderboard.map((entry, index) => (
            <p key={entry.playerName}>
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

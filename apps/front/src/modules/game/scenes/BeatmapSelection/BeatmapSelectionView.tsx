import { useState } from "react";
import { type ParsedMap } from "../../../osu/convert/OsuConverter";
import { MapPicker } from "@/app/game/_components/MapPicker";
import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { useQuery } from "@tanstack/react-query";

type BeatmapSelectionViewProps = {
  onPlayClicked: (selectedMap: ParsedMap) => void;
};

export const BeatmapSelectionView = ({ onPlayClicked }: BeatmapSelectionViewProps) => {
  const [selectedMap, setSelectedMap] = useState<ParsedMap | null>(null);

  const leaderboardQuery = useQuery({
    ...scoresBeatmapLeaderboardQueryOptions(selectedMap?.id ?? ""),
    enabled: !!selectedMap,
  });

  return (
    <>
      <MapPicker onMapPicked={setSelectedMap} />
      <button
        className="p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
        onClick={() => {
          if (selectedMap) {
            onPlayClicked(selectedMap);
          }
        }}
      >
        Play
      </button>
      {leaderboardQuery.isEnabled && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-white bg-white/10 p-6">
          {leaderboardQuery.isLoading && <p>Loading leaderboard...</p>}
          {leaderboardQuery.isError && <p>Error loading leaderboard</p>}

          {leaderboardQuery.data && leaderboardQuery.data.leaderboard.length > 0 ? (
            <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto">
              {leaderboardQuery.data.leaderboard.map((entry, index) => (
                <li key={entry.beatmapId + "_" + entry.playerName}>
                  {index + 1}. {entry.playerName} -{" "}
                  {entry.score
                    .toString()
                    .split("")
                    .flatMap((c, i, a) => (i && (a.length - i) % 3 === 0 ? [" ", c] : [c]))
                    .join("")}
                  <br /> {entry.accuracy.toFixed(2)}% - {entry.maxCombo}x
                </li>
              ))}
            </div>
          ) : (
            <p>No scores yet</p>
          )}
        </div>
      )}
    </>
  );
};

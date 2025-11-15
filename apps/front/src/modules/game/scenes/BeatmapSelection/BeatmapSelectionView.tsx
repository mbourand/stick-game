import { useState } from "react";
import { type ParsedMap } from "../../../osu/convert/OsuConverter";
import { MapPicker } from "@/app/game/_components/MapPicker";
import { useScoresBeatmapLeaderboard } from "@/modules/fetching/back/queries/useScoresBeatmapLeaderboard";

type BeatmapSelectionViewProps = {
  onPlayClicked: (selectedMap: ParsedMap) => void;
};

export const BeatmapSelectionView = ({ onPlayClicked }: BeatmapSelectionViewProps) => {
  const [selectedMap, setSelectedMap] = useState<ParsedMap | null>(null);

  const leaderboardQuery = useScoresBeatmapLeaderboard(1, true);

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
      <div className="absolute left-0 top-1/2 -translate-y-1/2 text-white bg-white/10 p-6">
        {leaderboardQuery.isLoading && <p>Loading leaderboard...</p>}
        {leaderboardQuery.isError && <p>Error loading leaderboard</p>}
        {leaderboardQuery.data && (
          <ul>
            {leaderboardQuery.data.leaderboard.map((entry, index) => (
              <li key={entry.beatmapId + "_" + entry.playerName}>
                {index + 1}. {entry.playerName} - {entry.score}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

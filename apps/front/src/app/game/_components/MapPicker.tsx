import { useMemo, useRef, useState } from "react";
import { convertFromOsu, type ParsedMap } from "../../../modules/osu/convert/OsuConverter";
import { FolderPicker } from "../../../components/FolderPicker";
import { OsuDBParser, type OsuDBType } from "../../../modules/osu/osu-db/OsuDBParser";

type MapPickerType = {
  onMapPicked: (parsedMap: ParsedMap) => void;
};

export const MapPicker = ({ onMapPicked }: MapPickerType) => {
  const [osuDb, setOsuDb] = useState<OsuDBType | null>(null);
  const [songsFiles, setSongsFiles] = useState<Map<string, File>>(new Map());

  const dbPickerRef = useRef<HTMLInputElement | null>(null);
  const songsPickerRef = useRef<HTMLInputElement | null>(null);

  const displayedBeatmaps = useMemo(() => {
    return osuDb?.beatmaps
      .filter((beatmap) => beatmap.gameplayMode === 0)
      .sort((a, b) => {
        const titleA = a.songTitle.toLowerCase();
        const titleB = b.songTitle.toLowerCase();
        if (titleA < titleB) return -1;
        if (titleA > titleB) return 1;
        return 0;
      });
  }, [osuDb]);

  return (
    <>
      <select
        className="bg-white text-black max-w-[250px]"
        defaultValue="select_map"
        id="map-picker"
        onChange={async (e) => {
          const index = Number(e.target.value);
          const isOsuMap = !isNaN(index);
          if (isOsuMap) {
            if (!displayedBeatmaps) return;
            const map = displayedBeatmaps[index];
            const mapFile = songsFiles.get(map.folderName + "/" + map.osuFilename);

            if (!mapFile) {
              console.error("Map file not found:", map.folderName + "/" + map.osuFilename);
              return;
            }

            const text = await mapFile.text();
            const parsedMap = convertFromOsu(text, (relativePath) => {
              const file = songsFiles.get(map.folderName + "/" + relativePath);
              if (!file) {
                console.warn("File not found for path:", relativePath);
                return relativePath;
              }

              return URL.createObjectURL(file);
            });
            onMapPicked(parsedMap);
            return;
          }

          try {
            const mapUrl = e.target.value;
            const baseUrl = mapUrl.slice(0, mapUrl.lastIndexOf("/"));
            const response = await fetch(mapUrl);
            if (!response.ok) throw new Error("Failed to load map file");
            const mapData = await response.text();
            const parsedMap = convertFromOsu(mapData, (path) => baseUrl + "/" + path);
            onMapPicked(parsedMap);
            return;
          } catch (error) {
            console.error("Failed to fetch map:", error);
            return;
          }
        }}
      >
        <option value="select_map" disabled>
          Select a beatmap
        </option>
        <option value="/nyan_pasu_bang_bang/beginner.osu">Nyanpasu Bang Bang - Beginner</option>
        <option value="/stronger_than_you/beginner.osu">Stronger Than You - Beginner</option>
        <option value="/hanairo_biyori/beginner.osu">Hanairo Biyori - Beginner</option>
        <option value="/red_lips/beginner.osu">Red Lips - Beginner</option>
        <option value="/megalovania/beginner.osu">Megalovania - Beginner</option>

        <option value="/centimeter/normal.osu">Centimeter - Easy</option>
        <option value="/no_title/easy.osu">No Title - Easy</option>
        <option value="/holdin_on/easy.osu">Holdin On - Easy</option>

        <option value="/centimeter/hard.osu">Centimeter - Normal</option>
        <option value="/tower_of_heaven/normal.osu">Tower of Heaven - Normal</option>
        <option value="/monster_effect/monster_effect.osu">Monster Effect - Normal</option>
        <option value="/black_rover/black_rover.osu">Black Rover - Normal</option>
        <option value="/inferno/inferno_normal.osu">Inferno - Normal</option>

        <option value="/asymmetry/asymmetry.osu">Asymmetry - Hard</option>
        <option value="/centimeter/insane.osu">Centimeter - Hard</option>
        <option value="/megalovania/hard.osu">Megalovania - Hard</option>
        <option value="/no_title/hard.osu">No Title - Hard</option>
        <option value="/machinegun_poem_doll/hard.osu">Machinegun poem doll - Hard</option>

        <option value="/no_title/insane.osu">No Title - Insane</option>
        <option value="/tower_of_heaven/another.osu">Tower of Heaven - Insane</option>
        <option value="/megalovania/insane.osu">Megalovania - Insane</option>
        <option value="/machinegun_poem_doll/insane.osu">Machinegun poem doll - Insane</option>

        <option value="/no_title/expert.osu">No Title - Expert</option>

        <option value="/make_a_move/make_a_move.osu">Make a Move (Speed Up Ver.) - Extra</option>
        <option value="/no_title/extra.osu">No Title - Extra</option>
        <option value="/hanairo_biyori/extra.osu">Hanairo Biyori - Extra</option>
        <option value="/inferno/inferno.osu">Inferno - Extra</option>
        <option value="/holdin_on/extra.osu">Holdin On - Extra</option>
        <option value="/machinegun_poem_doll/extra.osu">Machinegun poem doll - Extra</option>
        <option value="/through_the_fire_and_flames/extra.osu">Through the fire and flames - Extra</option>
        <option value="/symphony_of_the_night/extra.osu">Symphony of the night - Extra</option>
        {displayedBeatmaps?.map((map, index) => (
          <option key={index} value={index}>
            {map.songTitle} [{map.difficultyName}]
          </option>
        ))}
      </select>
    </>
  );
};

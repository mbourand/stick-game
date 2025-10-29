import { useMemo, useState } from "react";
import { convertFromOsu, type ParsedMap } from "../../../modules/osu/convert/OsuConverter";
import { FolderPicker } from "../../../components/FolderPicker";
import { OsuDBParser, type OsuDBType } from "../../../modules/osu/osu-db/OsuDBParser";

type MapPickerType = {
  onMapPicked: (parsedMap: ParsedMap) => void;
};

export const MapPicker = ({ onMapPicked }: MapPickerType) => {
  const [osuDb, setOsuDb] = useState<OsuDBType | null>(null);
  const [songsFiles, setSongsFiles] = useState<Map<string, File>>(new Map());

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
      <label htmlFor="db-picker" className="text-white">
        Osu db file
      </label>
      <input
        className="bg-white text-black"
        id="db-picker"
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const content = await file.arrayBuffer();
          const osuDB = new OsuDBParser(new Uint8Array(content));

          const db = osuDB.parseOsuDBData();
          console.log("Parsed osu!db:", db);
          setOsuDb(db);
        }}
      />
      <FolderPicker
        className="bg-white text-black"
        type="file"
        id="file-picker"
        multiple
        onChange={async (e) => {
          const files = e.target.files;
          if (!files) {
            return;
          }

          console.log(files[0].webkitRelativePath);
          setSongsFiles(
            new Map(
              Array.from(files).map((file) => [
                file.webkitRelativePath.slice(file.webkitRelativePath.indexOf("/") + 1),
                file,
              ]),
            ),
          );
        }}
      />
      {displayedBeatmaps && (
        <label htmlFor="map-picker" className="text-white">
          Select beatmap
        </label>
      )}
      {displayedBeatmaps && (
        <select
          className="bg-white text-black"
          id="map-picker"
          onChange={async (e) => {
            const map = displayedBeatmaps[Number(e.target.value)];
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
          }}
        >
          {displayedBeatmaps.map((map, index) => (
            <option key={index} value={index}>
              {map.songTitle} [{map.difficultyName}]
            </option>
          ))}
        </select>
      )}
    </>
  );
};

import { Modal } from "@/components/Modal";
import { beatmapsetsSearchQueryOptions } from "@/modules/fetching/back/queries/beatmapsets-search";
import { debounce } from "@/modules/utils/debounce";
import { useMemo, useState } from "react";
import JSZip from "jszip";
import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";
import { latestDb } from "@/modules/db/db";
import { BeatmapsetCard } from "@/app/game/_components/BeatmapCard";
import { useQuery } from "@tanstack/react-query";

type BeatmapsetDownloaderProps = {
  isVisible: boolean;
  onClose: () => void;
};

export const BeatmapsetDownloader = ({ isVisible, onClose }: BeatmapsetDownloaderProps) => {
  const [query, setQuery] = useState("");

  const debouncedSetQuery = useMemo(
    () =>
      debounce((newQuery: string) => {
        setQuery(newQuery);
      }, 1000),
    [],
  );

  const searchResults = useQuery({ ...beatmapsetsSearchQueryOptions(query), enabled: isVisible });

  return (
    <Modal isVisible={isVisible} onClose={onClose} rounded={false}>
      <h1 className="text-2xl bold">Download beatmaps</h1>
      <input
        type="text"
        className="bg-white text-black w-[500px] mt-4"
        onChange={(e) => debouncedSetQuery(e.target.value)}
        placeholder="Search... (ex. Brain Power)"
      />
      {searchResults.isLoading && <p className="mt-4">Loading beatmaps...</p>}
      {searchResults.data && (
        <div className="grid grid-cols-2 gap-y-4 gap-x-4 w-[900px] max-h-screen overflow-y-auto mt-8">
          {searchResults.data.beatmapsets.map((beatmapset) => (
            <BeatmapsetCard
              key={beatmapset.id}
              beatmapset={beatmapset}
              onDownloadClicked={async () => {
                const zip = new JSZip();
                const response = await fetch(
                  `https://api.nerinyan.moe/d/${beatmapset.id}?NoHitSound=1&NoStoryboard=1&NoVideo=1`,
                );

                const unzipped = await zip.loadAsync(await response.arrayBuffer());
                const allFiles = Object.values(unzipped.files);
                const beatmapFileList = allFiles.filter((file) => file.name.endsWith(".osu"));

                const listBackgroundFileResponse = await fetch(beatmapset.covers["list"], { mode: "no-cors" });
                const listBackgroundFileContent = await listBackgroundFileResponse.arrayBuffer();

                const listBackgroundFileId = await latestDb.files.add({
                  content: new Blob([listBackgroundFileContent]),
                  createdAt: new Date(),
                  extension: "jpg",
                });

                const alreadyAddedFiles = new Map<string, number>();

                for (const file of beatmapFileList) {
                  const content = await file.async("string");
                  const parsedMap = convertFromOsu(content, (path) => path);

                  const backgroundFile = allFiles.find((f) => f.name === parsedMap.backgroundUrl);
                  const audioFile = allFiles.find((f) => f.name === parsedMap.audioUrl);

                  let backgroundFileId: number | null =
                    (backgroundFile && alreadyAddedFiles.get(backgroundFile.name)) || null;
                  let audioFileId: number | null = (audioFile && alreadyAddedFiles.get(audioFile.name)) || null;

                  if (backgroundFile && !backgroundFileId) {
                    const fileContent = await backgroundFile.async("arraybuffer");
                    const fileBlob = new Blob([fileContent]);
                    backgroundFileId = await latestDb.files.add({
                      content: fileBlob,
                      createdAt: new Date(),
                      extension: backgroundFile.name.split(".").pop() || "",
                    });
                    alreadyAddedFiles.set(backgroundFile.name, backgroundFileId);
                  }

                  if (audioFile && !audioFileId) {
                    const fileContent = await audioFile.async("arraybuffer");
                    const fileBlob = new Blob([fileContent]);
                    audioFileId = await latestDb.files.add({
                      content: fileBlob,
                      createdAt: new Date(),
                      extension: audioFile.name.split(".").pop() || "",
                    });
                    alreadyAddedFiles.set(audioFile.name, audioFileId);
                  }

                  await latestDb.beatmaps.add({
                    idv2: parsedMap.id,
                    title: parsedMap.title,
                    artist: parsedMap.artist,
                    creator: parsedMap.creator,
                    difficulty: parsedMap.difficulty,
                    content: new Blob([content]),
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    gameplayBackgroundId: backgroundFileId!,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    audioId: audioFileId!,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    listBackgroundId: listBackgroundFileId!,
                    createdAt: new Date(),
                  });
                }
              }}
            />
          ))}
        </div>
      )}
    </Modal>
  );
};

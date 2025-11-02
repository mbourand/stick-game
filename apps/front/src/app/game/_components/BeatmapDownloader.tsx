import { Modal } from "@/components/Modal";
import { useBeatmapsetsSearch } from "@/modules/fetching/back/queries/useBeatmapsetsSearch";
import { debounce } from "@/modules/utils/debounce";
import { useMemo, useState } from "react";

type BeatmapDownloaderProps = {
  isVisible: boolean;
  onClose: () => void;
};

export const BeatmapDownloader = ({ isVisible, onClose }: BeatmapDownloaderProps) => {
  const [query, setQuery] = useState("");

  const debouncedSetQuery = useMemo(
    () =>
      debounce((newQuery: string) => {
        setQuery(newQuery);
      }, 1000),
    [],
  );

  const searchResults = useBeatmapsetsSearch(query);

  return (
    <Modal isVisible={isVisible} onClose={onClose} rounded={false}>
      <h1 className="text-2xl bold">Download beatmaps</h1>
      <input type="text" className="bg-white text-black" onChange={(e) => debouncedSetQuery(e.target.value)} />
      {searchResults.isLoading && <p>Loading...</p>}
      {searchResults.data && (
        <ul>
          {searchResults.data.beatmapsets.map((beatmapset) => (
            <li key={beatmapset.id} className="mb-4">
              <h2 className="text-xl">{beatmapset.title}</h2>
              <p>Artist: {beatmapset.artist}</p>
              <p>Mapper: {beatmapset.creator}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

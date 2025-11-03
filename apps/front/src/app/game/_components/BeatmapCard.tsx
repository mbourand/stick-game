import z from "zod";
import { zOsuControllerBeatmapsetsSearchResponse } from "@tau/back-schemas";
import Image from "next/image";
import { useState } from "react";

type BeatmapsetCardProps = {
  beatmapset: z.infer<typeof zOsuControllerBeatmapsetsSearchResponse>["beatmapsets"][number];
  onDownloadClicked: () => unknown;
};

export const BeatmapsetCard = ({ beatmapset, onDownloadClicked }: BeatmapsetCardProps) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div
      className="relative bg-cover bg-center px-4 py-1 rounded-lg h-24"
      style={{
        backgroundImage: `url(${beatmapset.covers["cover"]})`,
      }}
    >
      <div className="absolute top-0 left-0 backdrop-blur-[2px] bg-gradient-to-r from-black/60 to-black/30 w-full h-full rounded-lg" />
      <div className="absolute bottom-2 left-4 flex gap-1">
        <button
          className="rounded hover:bg-black/40 active:bg-black/50 transition-all w-6 h-6"
          onClick={async () => {
            setIsLoading(true);
            await onDownloadClicked();
            setIsLoading(false);
          }}
        >
          {!isLoading && (
            <Image
              width={24}
              height={24}
              className="w-full h-full"
              src="/icons/download.svg"
              alt="Download"
              unoptimized
            />
          )}
          {isLoading && (
            <div className="animate-spin w-4 h-4 m-1 border-t-white border-b-transparent border rounded-full" />
          )}
        </button>
      </div>
      <div className="relative z-1">
        <h2 className="text-xl font-medium whitespace-nowrap overflow-hidden text-ellipsis">{beatmapset.title}</h2>
        <p className="whitespace-nowrap overflow-hidden text-ellipsis text-gray-300">
          by {beatmapset.artist}, mapped by {beatmapset.creator}
        </p>
      </div>
      <div className="absolute bottom-2 right-2 flex flex-row gap-2 justify-end mt-2">
        {beatmapset.beatmaps
          .toSorted((a, b) => a.difficulty_rating - b.difficulty_rating)
          .slice(0, 3)
          .map((beatmap) => (
            <p key={beatmap.id}>{beatmap.difficulty_rating}*</p>
          ))}
        {beatmapset.beatmaps.length > 6 && <p>...</p>}
        {beatmapset.beatmaps.length > 3 &&
          beatmapset.beatmaps
            .toSorted((a, b) => a.difficulty_rating - b.difficulty_rating)
            .slice(Math.max(2, beatmapset.beatmaps.length - 2))
            .map((beatmap) => <p key={beatmap.id}>{beatmap.difficulty_rating}*</p>)}
      </div>
    </div>
  );
};

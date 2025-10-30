import { useState } from "react";
import { type ParsedMap } from "../../../osu/convert/OsuConverter";
import { SettingsDropdown } from "./components/NavBar/Settings/SettingsDropdown";
import { ImportFromOsu } from "./components/NavBar/ImportFromOsu/ImportFromOsu";

type BeatmapSelectionViewProps = {
  onPlayClicked: (selectedMap: ParsedMap) => void;
};

export const BeatmapSelectionView = ({ onPlayClicked }: BeatmapSelectionViewProps) => {
  const [selectedMap, setSelectedMap] = useState<ParsedMap | null>(null);

  return (
    <>
      <nav className="absolute top-0 left-0 w-full bg-neutral-900 flex flex-row items-center p-2 text-white z-50">
        <div className="w-full flex flex-row gap-2">
          <div className="bg-red-500 rounded-sm w-8 aspect-square" />
          <p className="text-lg">ShiroW_</p>
          <p className="text-lg ml-8">Rank #9999</p>
        </div>
        <div className="w-full text-center">00:00:00</div>
        <div className="w-full flex justify-end gap-4">
          <SettingsDropdown />
          <ImportFromOsu />
        </div>
      </nav>
      <img src="/public/asymmetry/BG.jpg" className="w-full h-full object-cover blur-md brightness-75" alt="" />
      <div className="absolute right-0 translate-x-4/5 w-[950px] aspect-square rounded-full outline-7 outline-white bg-black/70 top-[calc(50%+22px)] -translate-y-1/2" />
    </>
  );
};

import { useState } from "react";
import { convertFromOsu, type ParsedMap } from "../../../modules/osu/convert/OsuConverter";
import { BeatmapDownloader } from "@/app/game/_components/BeatmapDownloader";

type MapPickerType = {
  onMapPicked: (parsedMap: ParsedMap) => void;
};

export const MapPicker = ({ onMapPicked }: MapPickerType) => {
  const [isBeatmapDownloaderVisible, setIsBeatmapDownloaderVisible] = useState(false);

  return (
    <>
      <button
        className="p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
        onClick={() => setIsBeatmapDownloaderVisible(true)}
      >
        Download beatmaps
      </button>
      <BeatmapDownloader isVisible={isBeatmapDownloaderVisible} onClose={() => setIsBeatmapDownloaderVisible(false)} />
      <select className="bg-white text-black max-w-[250px]" defaultValue="select_map" id="map-picker">
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
      </select>
    </>
  );
};

import { GameCanvas } from "./modules/game/components/GameCanvas";
import "./modules/fonts/constants";
import { useEffect, useMemo, useRef, useState } from "react";
import { convertFromOsu, type ParsedMap } from "./modules/convert/OsuConverter";
import { GamepadMapping } from "./modules/gamepad/mapping/GamepadMapping";
import type { GamepadAxisKind, GamepadAxisMapping } from "./modules/gamepad/mapping/types";
import { DEFAULT_MAPPING } from "./modules/gamepad/mapping/constants";

const debounce = <T extends (...args: never[]) => void>(func: T, wait: number): T => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: never[]) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  } as T;
};

const ScrollSpeedSlider = ({ onChange }: { onChange: (value: number) => void }) => {
  const [scrollSpeed, setScrollSpeed] = useState(850);

  const debouncedSetScrollSpeed = useMemo(
    () =>
      debounce((speed: number) => {
        onChange(speed);
      }, 300),
    [onChange],
  );

  const changeScrollSpeed = (speed: number) => {
    debouncedSetScrollSpeed(speed);
    setScrollSpeed(speed);
  };

  return (
    <>
      <input
        type="range"
        min={300}
        max={2000}
        className=""
        defaultValue={scrollSpeed}
        onChange={(e) => changeScrollSpeed(Number(e.target.value))}
      />
      <span className="text-white"> Scroll Speed: {scrollSpeed}ms</span>
    </>
  );
};

function App() {
  const [parsedMap, setParsedMap] = useState<ParsedMap | undefined>(undefined);
  const [scrollSpeed, setScrollSpeed] = useState<number>(850);
  const selectRef = useRef<HTMLSelectElement>(null);
  const currentTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gamepadMapping, setGamepadMapping] = useState<Record<GamepadAxisKind, GamepadAxisMapping>>(DEFAULT_MAPPING);
  const [wasMappingDone, setWasMappingDone] = useState<boolean>(false);
  const [isGamepadMappingVisible, setIsGamepadMappingVisible] = useState<boolean>(false);

  useEffect(() => {
    if (wasMappingDone) return;

    const intervalId = setInterval(() => {
      const gamepad = navigator.getGamepads()[0];
      if (!gamepad) return;

      if (gamepad.mapping === "standard") {
        setWasMappingDone(true);
        return;
      }

      console.warn("Non-standard gamepad detected. Please configure your gamepad mapping.");
      setIsGamepadMappingVisible(true);
    }, 200);

    return () => clearInterval(intervalId);
  }, [wasMappingDone]);

  const changeMap = async (mapUrl: string) => {
    const baseUrl = mapUrl.slice(0, mapUrl.lastIndexOf("/"));

    try {
      const response = await fetch(mapUrl);
      if (!response.ok) throw new Error("Failed to load map file");
      const mapData = await response.text();
      console.log("Loaded map data:", mapData);
      const parsedMap = convertFromOsu(mapData, baseUrl);
      setParsedMap(parsedMap);
    } catch (error) {
      console.error("Failed to fetch map:", error);
      return;
    }
  };

  return (
    <div className="">
      <div className="absolute top-0 left-0 -z-1">
        {parsedMap && <GameCanvas scrollSpeed={scrollSpeed} parsedMap={parsedMap} gamepadMapping={gamepadMapping} />}
      </div>
      <div className="flex flex-row gap-4 items-center">
        <select ref={selectRef} className="bg-white p-2">
          <option value="" disabled selected>
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
        </select>
        <button
          className="p-2 bg-white/20 hover:bg-white/50 active:bg-white/80 text-white transition-all"
          onClick={() => {
            if (currentTimeoutId.current) {
              clearTimeout(currentTimeoutId.current);
            }
            currentTimeoutId.current = setTimeout(() => changeMap(selectRef.current?.value || ""), 1000);
          }}
        >
          Play beatmap
        </button>
        <ScrollSpeedSlider onChange={setScrollSpeed} />
      </div>
      {isGamepadMappingVisible && (
        <GamepadMapping
          onCompleted={(mapping) => {
            setIsGamepadMappingVisible(false);
            setWasMappingDone(true);
            setGamepadMapping(mapping);
          }}
        />
      )}
    </div>
  );
}

export default App;

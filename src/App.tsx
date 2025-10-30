import { GameCanvas } from "./modules/game/components/GameCanvas";
import "./modules/fonts/constants";
import { useEffect, useMemo, useState } from "react";
import { GamepadMapping } from "./modules/gamepad/mapping/GamepadMapping";
import { Settings } from "./modules/settings/Settings";

const debounce = <T extends (...args: never[]) => void>(func: T, wait: number): T => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (...args: never[]) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  } as T;
};

const SettingSlider = ({
  name,
  min,
  max,
  onChange,
  defaultValue,
}: {
  name: string;
  min: number;
  max: number;
  onChange: (value: number) => void;
  defaultValue: number;
}) => {
  const [value, setValue] = useState(defaultValue);

  const debouncedSetValue = useMemo(
    () =>
      debounce((newValue: number) => {
        onChange(newValue);
      }, 300),
    [onChange],
  );

  const changeValue = (newValue: number) => {
    debouncedSetValue(newValue);
    setValue(newValue);
  };

  return (
    <>
      <span className="text-white">
        {name}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        className=""
        defaultValue={value}
        onChange={(e) => changeValue(Number(e.target.value))}
      />
    </>
  );
};

function App() {
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

  return (
    <div>
      <div className="absolute top-0 left-0 -z-1">
        <GameCanvas />
      </div>
      <div className="flex flex-row gap-4 items-center">
        <SettingSlider
          name="Scroll Duration"
          defaultValue={Settings.getSettings().scrollDuration}
          min={300}
          max={2000}
          onChange={(value) => {
            Settings.set("scrollDuration", value);
          }}
        />
        <SettingSlider
          name="Volume"
          defaultValue={Settings.getSettings().volume * 100}
          min={0}
          max={100}
          onChange={(value) => {
            Settings.set("volume", value / 100);
          }}
        />
        <SettingSlider
          name="BG Blur"
          defaultValue={Settings.getSettings().backgroundBlurriness}
          min={0}
          max={20}
          onChange={(value) => {
            Settings.set("backgroundBlurriness", value);
          }}
        />
        <SettingSlider
          name="BG Brightness"
          defaultValue={Settings.getSettings().backgroundBrightness * 100}
          min={0}
          max={100}
          onChange={(value) => {
            Settings.set("backgroundBrightness", value / 100);
          }}
        />
      </div>
      {isGamepadMappingVisible && (
        <GamepadMapping
          onCompleted={(mapping) => {
            setIsGamepadMappingVisible(false);
            setWasMappingDone(true);
            Settings.set("gamepadMapping", mapping);
          }}
        />
      )}
    </div>
  );
}

export default App;

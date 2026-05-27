"use client";

import { GameShell } from "@/modules/game/components/GameShell";
import { Settings } from "@/modules/settings/Settings";
import { debounce } from "@/modules/utils/debounce";
import { useEffect, useMemo, useState } from "react";

const GamepadSelector = () => {
  const [pads, setPads] = useState<{ index: number; id: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    Settings.getSettings().selectedGamepadIndex,
  );

  useEffect(() => {
    const refresh = () => {
      const detected: { index: number; id: string }[] = [];
      for (const pad of navigator.getGamepads()) {
        if (pad) detected.push({ index: pad.index, id: pad.id });
      }
      setPads(detected);
    };
    refresh();
    window.addEventListener("gamepadconnected", refresh);
    window.addEventListener("gamepaddisconnected", refresh);
    const intervalId = setInterval(refresh, 1000);
    return () => {
      window.removeEventListener("gamepadconnected", refresh);
      window.removeEventListener("gamepaddisconnected", refresh);
      clearInterval(intervalId);
    };
  }, []);

  const onChange = (value: string) => {
    const index = Number(value);
    setSelectedIndex(index);
    Settings.set("selectedGamepadIndex", index);
  };

  return (
    <>
      <span className="text-white text-sm whitespace-nowrap">Gamepad:</span>
      <select
        className="w-[160px] text-sm bg-white text-black"
        value={selectedIndex ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="" disabled hidden>
          Select a gamepad...
        </option>
        {pads.map((pad) => (
          <option key={pad.index} value={pad.index}>
            {pad.index}: {pad.id}
          </option>
        ))}
      </select>
    </>
  );
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
      <span className="text-white text-sm whitespace-nowrap">
        {name}: {value}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        className="w-[125px]"
        defaultValue={value}
        onChange={(e) => changeValue(Number(e.target.value))}
      />
    </>
  );
};

export const ClientSideGame = () => {
  return (
    <>
      <GameShell />
      <div className="absolute top-0 right-0 flex flex-row gap-4 items-center z-10">
        <span className="text-white text-sm whitespace-nowrap">Player Name:</span>
        <input
          type="text"
          className="w-[125px] bg-white text-black"
          defaultValue={Settings.getSettings().playerName}
          onChange={(e) => Settings.set("playerName", e.target.value)}
        />
        <SettingSlider
          name="Scroll Duration"
          defaultValue={Settings.getSettings().scrollDuration}
          min={300}
          max={1700}
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
        <GamepadSelector />
      </div>
    </>
  );
};

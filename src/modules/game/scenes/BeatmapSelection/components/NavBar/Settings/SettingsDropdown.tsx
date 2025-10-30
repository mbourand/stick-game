import { useEffect, useRef, useState } from "react";
import { Settings } from "../../../../../../settings/Settings";
import { SettingSlider } from "./SettingsSlider";

export const SettingsDropdown = () => {
  const [isSettingsDropdownVisible, setIsSettingsDropdownVisible] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const handleClickOutside = (event: MouseEvent) => {
      if (event.target instanceof Node === false) return;

      const isClickOnButton = buttonRef.current?.contains(event.target);
      const isClickOnDropdown = dropdownRef.current?.contains(event.target);
      if (!isClickOnButton && !isClickOnDropdown && isSettingsDropdownVisible) setIsSettingsDropdownVisible(false);
    };

    window.addEventListener("click", handleClickOutside, { signal: ac.signal });
    return () => ac.abort();
  }, [isSettingsDropdownVisible]);

  return (
    <>
      <button
        ref={buttonRef}
        className="text-[24px] rounded-sm cursor-pointer relative"
        onClick={() => setIsSettingsDropdownVisible(!isSettingsDropdownVisible)}
      >
        ⚙️
      </button>
      {isSettingsDropdownVisible && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 bg-neutral-800 p-4 flex flex-col gap-4 rounded-sm z-10 -translate-x-full min-w-[300px] w-max"
          style={{
            left: buttonRef.current?.getBoundingClientRect().right,
          }}
        >
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
            name="Background Blur"
            defaultValue={Settings.getSettings().backgroundBlurriness}
            min={0}
            max={20}
            onChange={(value) => {
              Settings.set("backgroundBlurriness", value);
            }}
          />
          <SettingSlider
            name="Background Brightness"
            defaultValue={Settings.getSettings().backgroundBrightness * 100}
            min={0}
            max={100}
            onChange={(value) => {
              Settings.set("backgroundBrightness", value / 100);
            }}
          />
        </div>
      )}
    </>
  );
};

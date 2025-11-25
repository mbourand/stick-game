import { EventManager } from "../game/events/EventManager";
import { SettingChangedEvent } from "../game/events/impl/SettingChangedEventType";
import { DEFAULT_MAPPING } from "../gamepad/mapping/constants";
import type { GamepadMappingType } from "../gamepad/mapping/types";

export type SettingsListType = {
  volume: number;
  backgroundBrightness: number;
  backgroundBlurriness: number;
  gamepadMapping: GamepadMappingType;
  scrollDuration: number;
};

export const DEFAULT_SETTINGS: SettingsListType = {
  volume: 0.2,
  backgroundBrightness: 0.15,
  backgroundBlurriness: 4,
  gamepadMapping: DEFAULT_MAPPING,
  scrollDuration: 850,
};

export class Settings {
  private static settings = Settings.loadSettings();

  private static eventManager = new EventManager();

  public static getSettings(): SettingsListType {
    return structuredClone(Settings.settings);
  }

  public static set<K extends keyof SettingsListType>(key: K, value: SettingsListType[K]) {
    console.log(`Setting changed: ${key} =`, value);
    Settings.settings[key] = value;
    Settings.eventManager.emit("onSettingChanged", SettingChangedEvent(key, value));
    localStorage.setItem("settings", JSON.stringify(Settings.settings));
  }

  public static loadSettings() {
    const savedSettings = localStorage.getItem("settings");
    if (!savedSettings) return DEFAULT_SETTINGS;
    try {
      return JSON.parse(savedSettings) as SettingsListType;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public static getEventManager() {
    return Settings.eventManager;
  }
}

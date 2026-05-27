import { EventEmitter } from "../utils/EventEmitter";
import { SettingChangedEvent, type SettingChangedEventType } from "./SettingChangedEvent";

export type SettingsListType = {
  volume: number;
  backgroundBrightness: number;
  backgroundBlurriness: number;
  scrollDuration: number;
  playerName: string;
  selectedGamepadIndex: number | null;
};

export const DEFAULT_SETTINGS: SettingsListType = {
  volume: 0.2,
  backgroundBrightness: 0.15,
  backgroundBlurriness: 4,
  scrollDuration: 850,
  playerName: "Guest",
  selectedGamepadIndex: null,
};

type SettingsEvents = {
  onSettingChanged: (e: SettingChangedEventType) => void;
};

const STORAGE_KEY = "settings";

export class Settings {
  public readonly events = new EventEmitter<SettingsEvents>();

  private values: SettingsListType;

  constructor(initial?: SettingsListType) {
    this.values = initial ?? Settings.loadFromStorage();
  }

  public get(): SettingsListType {
    return structuredClone(this.values);
  }

  public set<K extends keyof SettingsListType>(key: K, value: SettingsListType[K]) {
    console.log(`Setting changed: ${key} =`, value);
    this.values[key] = value;
    this.events.emit("onSettingChanged", SettingChangedEvent(key, value));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      // ignore quota / private-mode failures
    }
  }

  private static loadFromStorage(): SettingsListType {
    if (typeof localStorage === "undefined") return DEFAULT_SETTINGS;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(saved) as Partial<SettingsListType>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

export const settings = new Settings();

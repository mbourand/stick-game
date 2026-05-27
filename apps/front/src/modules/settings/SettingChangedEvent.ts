import type { SettingsListType } from "./Settings";

export const SettingChangedEvent = <K extends keyof SettingsListType>(key: K, value: SettingsListType[K]) => {
  return {
    get key() {
      return key;
    },
    get value() {
      return value;
    },
  };
};

export type SettingChangedEventType = ReturnType<typeof SettingChangedEvent>;

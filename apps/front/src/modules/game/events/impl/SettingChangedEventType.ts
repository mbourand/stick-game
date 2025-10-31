import type { SettingsListType } from "../../../settings/Settings";

export const SettingChangedEvent = (key: keyof SettingsListType, value: SettingsListType[keyof SettingsListType]) => {
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

import { useEffect, useState } from "react";
import { settings, type SettingsListType } from "../../../settings/Settings";

/**
 * Live snapshot of the global Settings instance. Each consumer holds its own
 * state and refreshes via the Settings event emitter — equivalent to a
 * useSyncExternalStore but with a captured snapshot (Settings.get returns a
 * fresh clone each call, which would defeat reference equality).
 */
export function useSettings(): SettingsListType {
  const [snapshot, setSnapshot] = useState<SettingsListType>(() => settings.get());
  useEffect(() => settings.events.on("onSettingChanged", () => setSnapshot(settings.get())), []);
  return snapshot;
}

import { settings, type SettingsListType } from "../../../settings/Settings";
import { useStore } from "./useStore";

/**
 * Live snapshot of the global Settings instance. Settings exposes a stable
 * snapshot (`get`) plus `subscribe`, so it plugs straight into `useStore` —
 * the same path the viewport store uses.
 */
export function useSettings(): SettingsListType {
  return useStore(settings);
}

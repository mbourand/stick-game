import type { Settings, SettingsListType } from "../../../settings/Settings";

/**
 * Per-row description of every setting the user can edit from the scene.
 * The scene only knows the row `kind` — it dispatches input to the matching
 * handler. The view only knows the row `kind` — it dispatches rendering to
 * the matching component. New settings get a single new entry here.
 */

/** Group heading a row belongs under. Rows sharing a section render below one label. */
export type SettingsSection = "General" | "Gameplay" | "Menu";

export type SliderRow = {
  kind: "slider";
  id: string;
  section: SettingsSection;
  label: string;
  min: number;
  max: number;
  step: number;
  /** Read the row's displayed value from the live settings snapshot. */
  read: (s: SettingsListType) => number;
  /** Write the row's displayed value back through the settings instance. */
  write: (settings: Settings, displayed: number) => void;
  /** Display formatter (e.g. add "%", " ms"). Defaults to plain digits. */
  format?: (v: number) => string;
};

export type TextRow = {
  kind: "text";
  id: string;
  section: SettingsSection;
  label: string;
  read: (s: SettingsListType) => string;
  write: (settings: Settings, value: string) => void;
  /** Shown beneath the value while the row is in edit mode. */
  editHint?: string;
};

export type GamepadRow = {
  kind: "gamepad";
  id: string;
  section: SettingsSection;
  label: string;
};

export type SettingsRow = SliderRow | TextRow | GamepadRow;

export const SETTINGS_ROWS: readonly SettingsRow[] = [
  {
    kind: "slider",
    id: "volume",
    section: "General",
    label: "Volume",
    min: 0,
    max: 100,
    step: 1,
    read: (s) => Math.round(s.volume * 100),
    write: (sv, v) => sv.set("volume", v / 100),
    format: (v) => `${v}%`,
  },
  {
    kind: "text",
    id: "playerName",
    section: "General",
    label: "Player name",
    read: (s) => s.playerName,
    write: (sv, v) => sv.set("playerName", v),
    editHint: "Type on a keyboard to edit",
  },
  {
    kind: "gamepad",
    id: "gamepad",
    section: "General",
    label: "Gamepad",
  },
  {
    kind: "slider",
    id: "scrollDuration",
    section: "Gameplay",
    label: "Scroll duration",
    min: 300,
    max: 1700,
    step: 10,
    read: (s) => s.scrollDuration,
    write: (sv, v) => sv.set("scrollDuration", v),
    format: (v) => `${v} ms`,
  },
  {
    kind: "slider",
    id: "gameplayCircleScale",
    section: "Gameplay",
    label: "Circle size",
    min: 70,
    max: 130,
    step: 5,
    read: (s) => Math.round(s.gameplayCircleScale * 100),
    write: (sv, v) => sv.set("gameplayCircleScale", v / 100),
    format: (v) => `${v}%`,
  },
  {
    kind: "slider",
    id: "backgroundBrightness",
    section: "Gameplay",
    label: "Background brightness",
    min: 0,
    max: 100,
    step: 1,
    read: (s) => Math.round(s.backgroundBrightness * 100),
    write: (sv, v) => sv.set("backgroundBrightness", v / 100),
    format: (v) => `${v}%`,
  },
  {
    kind: "slider",
    id: "backgroundBlurriness",
    section: "Gameplay",
    label: "Background blur",
    min: 0,
    max: 20,
    step: 1,
    read: (s) => s.backgroundBlurriness,
    write: (sv, v) => sv.set("backgroundBlurriness", v),
    format: (v) => `${v} px`,
  },
  {
    kind: "slider",
    id: "menuBackgroundBrightness",
    section: "Menu",
    label: "Background brightness",
    min: 0,
    max: 100,
    step: 1,
    read: (s) => Math.round(s.menuBackgroundBrightness * 100),
    write: (sv, v) => sv.set("menuBackgroundBrightness", v / 100),
    format: (v) => `${v}%`,
  },
  {
    kind: "slider",
    id: "menuBackgroundBlurriness",
    section: "Menu",
    label: "Background blur",
    min: 0,
    max: 20,
    step: 1,
    read: (s) => s.menuBackgroundBlurriness,
    write: (sv, v) => sv.set("menuBackgroundBlurriness", v),
    format: (v) => `${v} px`,
  },
] as const;

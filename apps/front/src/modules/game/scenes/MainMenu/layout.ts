/**
 * The main menu's ring radius. Larger than the default gameplay ring
 * (GAME_CIRCLE_DISPLAYED_RADIUS = 310) so the menu reads as a spacious hub and
 * has room for content inside it (e.g. the now-playing label); still a touch
 * smaller than beatmap selection's 460.
 */
export const MAIN_MENU_CIRCLE_RADIUS = 400;

export type ButtonId = "play" | "leaderboards" | "edit" | "settings" | "account";

export type RadialButtonConfig = {
  id: ButtonId;
  label: string;
  hint: string;
};

// The `account` button's label/hint are overridden in the view depending on
// whether the player is signed in ("Sign In" vs "Profile"); the values here are
// the logged-out defaults.
export const BUTTONS: RadialButtonConfig[] = [
  { id: "play", label: "Play", hint: "Browse and play beatmaps" },
  { id: "leaderboards", label: "Leaderboards", hint: "Global player rankings" },
  { id: "edit", label: "Edit", hint: "Create or edit beatmapsets" },
  { id: "settings", label: "Settings", hint: "Configure Tau to suit your preferences" },
  { id: "account", label: "Sign In", hint: "Sign in or manage your account" },
];

export const BUTTON_WIDTH_PX = 500;
export const BUTTON_HEIGHT_PX = 112;
export const BUTTON_Y_GAP_PX = 16;

/**
 * Extra room on the curve-facing side of each radial-button's outer wrapper.
 * Doubles as the retract distance — the shared RadialButton derives the
 * inner translateX from `outerWidth - buttonWidth`, so this value IS the
 * magnitude the inner button slides under the curve on exit.
 */
export const OUTER_LEFT_EXTRA_PX = 260;

export const BUTTON_STAGGER_S = 0.04;

export function getButtonYOffsetFromCenter(index: number): number {
  return (index - (BUTTONS.length - 1) / 2) * (BUTTON_HEIGHT_PX + BUTTON_Y_GAP_PX);
}

// ---- Jukebox transport controls ------------------------------------------
// Laid out at explicit design coordinates (px from the circle centre) so the
// view renders them and the scene's stick "hover" hit-test agree exactly — the
// stick dot renders at stick·radius, so pointing it at a button focuses it.

/** The transport controls, left→right. */
export const JUKEBOX_CONTROLS = ["previous", "pause", "skip"] as const;
export type JukeboxControl = (typeof JUKEBOX_CONTROLS)[number];

export const JUKEBOX_BUTTON_SIZE_PX = 56;
export const JUKEBOX_BUTTON_GAP_PX = 22;
/** Vertical centre of the now-playing label, px below the circle centre. */
export const JUKEBOX_LABEL_Y_FROM_CENTER = 116;
/** Vertical centre of the transport row, px below the circle centre (below the label). */
export const JUKEBOX_ROW_Y_FROM_CENTER = 180;

const JUKEBOX_PITCH_PX = JUKEBOX_BUTTON_SIZE_PX + JUKEBOX_BUTTON_GAP_PX;
/** Vertical reach of the hover hit-test around the row centre. */
const JUKEBOX_HIT_HALF_HEIGHT_PX = JUKEBOX_BUTTON_SIZE_PX / 2 + 28;

/** Horizontal centre of transport control `index` (0..2), px from the circle centre. */
export function jukeboxButtonXFromCenter(index: number): number {
  return (index - (JUKEBOX_CONTROLS.length - 1) / 2) * JUKEBOX_PITCH_PX;
}

/**
 * Which transport control (if any) the point `(px, py)` — in px from the circle
 * centre — lands on. Used to focus a control when the stick pointer hovers it.
 */
export function jukeboxControlAtPoint(px: number, py: number): number | null {
  if (Math.abs(py - JUKEBOX_ROW_Y_FROM_CENTER) > JUKEBOX_HIT_HALF_HEIGHT_PX) return null;
  for (let i = 0; i < JUKEBOX_CONTROLS.length; i++) {
    if (Math.abs(px - jukeboxButtonXFromCenter(i)) <= JUKEBOX_PITCH_PX / 2) return i;
  }
  return null;
}

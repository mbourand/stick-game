export type ButtonId = "play" | "edit" | "settings" | "exit";

export type RadialButtonConfig = {
  id: ButtonId;
  label: string;
  hint: string;
};

export const BUTTONS: RadialButtonConfig[] = [
  { id: "play", label: "Play", hint: "Browse and play beatmaps" },
  { id: "edit", label: "Edit", hint: "Create or edit beatmapsets" },
  { id: "settings", label: "Settings", hint: "Configure Tau! to suit your preferences" },
  { id: "exit", label: "Exit", hint: "Exit the game" },
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

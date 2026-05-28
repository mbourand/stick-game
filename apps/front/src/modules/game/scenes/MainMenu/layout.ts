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
 * Extra width on the LEFT of each radial-button's outer wrapper. The mask
 * lives on the static outer; the inner button translates leftward inside it
 * during the retract animation, so the curve clips the button rather than
 * moving with it. Must be at least |BUTTON_RETRACT_X|.
 */
export const OUTER_LEFT_EXTRA_PX = 260;

/** Inner translateX during the retract / re-enter animation. */
export const BUTTON_RETRACT_X = -OUTER_LEFT_EXTRA_PX;

export function getButtonYOffsetFromCenter(index: number): number {
  return (index - (BUTTONS.length - 1) / 2) * (BUTTON_HEIGHT_PX + BUTTON_Y_GAP_PX);
}

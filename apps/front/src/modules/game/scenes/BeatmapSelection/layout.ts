import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../utils/constants";
import { computeRadialButtonLayout } from "../shared/radialButton";

export const BUTTON_HEIGHT_PX = 92;
export const BUTTON_WIDTH_PX = 520;
export const BUTTON_Y_GAP_PX = 8;
export const VERTICAL_PITCH_PX = BUTTON_HEIGHT_PX + BUTTON_Y_GAP_PX;

/** Circle radius this scene uses — exported so the view / scene stay in sync. */
export const CIRCLE_RADIUS_PX = BEATMAP_SELECTION_CIRCLE_RADIUS;

/**
 * Extra width the radial-button's outer wrapper carries on its LEFT side, so
 * the inner button can translateX leftward (during the retract animation) and
 * still be enclosed by the wrapper — the wrapper holds the screen-anchored
 * mask, so the inner sliding past it is what produces the "clip under the
 * circle" effect.
 *
 * Must be at least |BUTTON_RETRACT_X|.
 */
export const OUTER_LEFT_EXTRA_PX = 260;

/** Inner translateX during the retract / re-enter animation. */
export const BUTTON_RETRACT_X = -OUTER_LEFT_EXTRA_PX;

export const BUTTON_STAGGER_S = 0.025;
export const PHASE_DURATION_S = 0.32;

/**
 * Stick magnitude required for any input to register. Anything below counts as
 * a resting stick.
 */
export const STICK_ACTIVE_THRESHOLD = 0.6;

/**
 * Vertical bound (in screen px from circle centre) past which the stick is
 * treated as engaging the top/bottom scroll surface instead of pointing at a
 * button. Chosen just inside the circle so the topmost / bottommost buttons
 * remain reachable by the stick.
 */
export const SCROLL_ZONE_Y_PX = CIRCLE_RADIUS_PX * 0.85;

/** Items scrolled per second when a scroll zone is held at maximum push. */
export const MAX_SCROLL_SPEED_ITEMS_PER_SEC = 6;

/**
 * How far (in items, beyond the visible window) we keep rendering. Provides
 * headroom for the smooth scroll without popping items in/out at the boundary.
 */
const RENDER_OVERSCAN_ITEMS = 2;

export function getVisibleIndexRange(
  scrollFloor: number,
  itemCount: number,
): { firstIndex: number; lastIndex: number } {
  if (itemCount === 0) return { firstIndex: 0, lastIndex: -1 };
  const itemsPerSide = Math.ceil(
    (CIRCLE_RADIUS_PX + BUTTON_HEIGHT_PX) / VERTICAL_PITCH_PX,
  ) + RENDER_OVERSCAN_ITEMS;
  const firstIndex = Math.max(0, scrollFloor - itemsPerSide);
  const lastIndex = Math.min(itemCount - 1, scrollFloor + itemsPerSide);
  return { firstIndex, lastIndex };
}

/**
 * Writes the radial-button layout (outer position + screen-anchored mask,
 * inner padding-left) directly onto DOM elements. Called every frame from the
 * view's `useFrame` so the buttons follow the smooth `scrollOffset` without
 * React re-renders.
 *
 * `yCenter` is the button centre's vertical offset from the circle's centre,
 * in screen pixels (negative = above, positive = below).
 *
 * `outer` is the static wrapper (carries the mask + position). Its first
 * element child is expected to be the inner button; its padding-left is
 * computed so visible content stays out of the masked area.
 */
export function applyRadialLayout(outer: HTMLElement, yCenter: number, r: number): void {
  const { top, left, mask, paddingNear } = computeRadialButtonLayout({
    side: "right",
    yCenter,
    radius: r,
    buttonW: BUTTON_WIDTH_PX,
    buttonH: BUTTON_HEIGHT_PX,
    outerExtraPx: OUTER_LEFT_EXTRA_PX,
  });

  const outerStyle = outer.style;
  outerStyle.top = `${top}px`;
  outerStyle.left = `${left}px`;
  outerStyle.maskImage = mask;
  outerStyle.webkitMaskImage = mask;
  outerStyle.maskComposite = "intersect";

  const inner = outer.firstElementChild;
  if (inner instanceof HTMLElement) inner.style.paddingLeft = `${paddingNear}px`;
}

/** Inner translate for left-side buttons retracting into the circle (positive: slides right). */
export const LEFT_BUTTON_RETRACT_X = OUTER_LEFT_EXTRA_PX;

/**
 * Vertical position of the index-th left button when there are `count` total,
 * distributed symmetrically around the circle's vertical centre.
 */
export function getLeftButtonYCenter(index: number, count: number): number {
  return (index - (count - 1) / 2) * VERTICAL_PITCH_PX;
}

/** Helper for fixed (non-virtualised) left-side action buttons — mirror of `applyRadialLayout`. */
export function computeLeftRadialLayout(
  yCenter: number,
  r: number,
): { top: number; left: number; outerWidth: number; mask: string; paddingRight: number } {
  const layout = computeRadialButtonLayout({
    side: "left",
    yCenter,
    radius: r,
    buttonW: BUTTON_WIDTH_PX,
    buttonH: BUTTON_HEIGHT_PX,
    outerExtraPx: OUTER_LEFT_EXTRA_PX,
  });
  return {
    top: layout.top,
    left: layout.left,
    outerWidth: layout.outerWidth,
    mask: layout.mask,
    paddingRight: layout.paddingNear,
  };
}

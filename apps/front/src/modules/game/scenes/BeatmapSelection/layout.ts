import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../utils/constants";
import { computeRadialButtonLayout } from "../shared/radialButtonLayout";

export const BUTTON_HEIGHT_PX = 92;
export const BUTTON_WIDTH_PX = 520;
export const BUTTON_Y_GAP_PX = 8;
export const VERTICAL_PITCH_PX = BUTTON_HEIGHT_PX + BUTTON_Y_GAP_PX;

/** Circle radius this scene uses — exported so the view / scene stay in sync. */
export const CIRCLE_RADIUS_PX = BEATMAP_SELECTION_CIRCLE_RADIUS;

/**
 * Extra room on the curve-facing side of each radial-button's outer wrapper.
 * Doubles as the retract distance — the shared RadialButton derives the
 * inner translateX from `outerWidth - buttonWidth`, so this value IS the
 * magnitude the inner button slides under the curve on exit.
 */
export const OUTER_LEFT_EXTRA_PX = 260;

export const BUTTON_STAGGER_S = 0.025;

/**
 * Stick magnitude required for any input to register. Anything below counts as
 * a resting stick.
 */
export const STICK_ACTIVE_THRESHOLD = 0.9;

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
  const itemsPerSide = Math.ceil((CIRCLE_RADIUS_PX + BUTTON_HEIGHT_PX) / VERTICAL_PITCH_PX) + RENDER_OVERSCAN_ITEMS;
  const firstIndex = Math.max(0, scrollFloor - itemsPerSide);
  const lastIndex = Math.min(itemCount - 1, scrollFloor + itemsPerSide);
  return { firstIndex, lastIndex };
}

/**
 * Single screen-anchored mask applied to the scrolling list container.
 * Hides anything that falls inside the ring's radius — buttons sliding past
 * the curve clip naturally, with no per-button mask string to recompute.
 * Pair with `overflow: hidden` on the container so buttons that scroll above
 * or below the ring's vertical extent are clipped too.
 *
 * The mask centre is pinned in pixels (not 50%) because the container is
 * widened past the ring's right edge to fit the buttons' full extent — the
 * gradient must stay aligned to the ring, not to the container.
 */
export const RADIAL_LIST_MASK = `radial-gradient(circle at ${CIRCLE_RADIUS_PX}px 50%, transparent ${
  CIRCLE_RADIUS_PX - 0.5
}px, black ${CIRCLE_RADIUS_PX + 0.5}px)`;

/**
 * Vertical position of the index-th left button when there are `count` total,
 * distributed symmetrically around the circle's vertical centre.
 */
export function getLeftButtonYCenter(index: number, count: number): number {
  return (index - (count - 1) / 2) * VERTICAL_PITCH_PX;
}

/** Helper for fixed (non-virtualised) left-side action buttons — mirror of `computeRadialButtonLayout` with side-specific field names. */
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

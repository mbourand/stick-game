import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../utils/constants";

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
  const halfH = BUTTON_HEIGHT_PX / 2;
  const farY = Math.abs(yCenter) + halfH;
  const horizontalRadiusAtFarY = Math.sqrt(Math.max(0, r * r - farY * farY));

  // Outer extends OUTER_LEFT_EXTRA_PX past the inner button on the LEFT, so
  // the inner can translateX(-OUTER_LEFT_EXTRA_PX) and stay enclosed.
  const top = r + yCenter - halfH;
  const left = r + horizontalRadiusAtFarY - OUTER_LEFT_EXTRA_PX;

  // Mask centre, expressed in outer-local coords (outer's top-left = origin).
  const maskCenterX = OUTER_LEFT_EXTRA_PX - horizontalRadiusAtFarY;
  const maskCenterY = halfH - yCenter;
  const mask = `radial-gradient(circle at ${maskCenterX}px ${maskCenterY}px, transparent ${r - 0.5}px, black ${r + 0.5}px)`;

  // Furthest the circle's curve reaches into the visible inner button — that's
  // where content must start to avoid being clipped by the mask in the static
  // (translateX === 0) state.
  const closestRowY = Math.max(0, Math.min(BUTTON_HEIGHT_PX, maskCenterY));
  const yDelta = closestRowY - maskCenterY;
  const maxHiddenX = maskCenterX + Math.sqrt(Math.max(0, r * r - yDelta * yDelta));
  const paddingLeft = Math.max(28, maxHiddenX - OUTER_LEFT_EXTRA_PX + 28);

  const outerStyle = outer.style;
  outerStyle.top = `${top}px`;
  outerStyle.left = `${left}px`;
  outerStyle.maskImage = mask;
  outerStyle.webkitMaskImage = mask;

  const inner = outer.firstElementChild;
  if (inner instanceof HTMLElement) inner.style.paddingLeft = `${paddingLeft}px`;
}

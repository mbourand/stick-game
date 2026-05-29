/**
 * Geometry for buttons that sit tangent to the circle's curve, with a mask
 * anchored to the circle so the button gets clipped by the curve as it slides
 * in/out during retract animations.
 *
 * Both side variants share the same math; the side flag flips signs so the
 * "near" edge (left of a right-side button, right of a left-side button)
 * sits flush against the curve.
 *
 *   yCenter — vertical offset from the circle's centre (negative = above)
 *   radius  — circle radius in screen px
 *   buttonW/H — visible button size
 *   outerExtraPx — extra width on the FAR side of the outer wrapper, so the
 *     inner button can translate that far during the retract animation and
 *     stay enclosed (the wrapper carries the mask, so the inner sliding past
 *     the curve is what produces the clip effect).
 */
export type RadialButtonInput = {
  side: "left" | "right";
  yCenter: number;
  radius: number;
  buttonW: number;
  buttonH: number;
  outerExtraPx: number;
  /** Minimum padding on the "near" side, defaults to 28. */
  minNearPaddingPx?: number;
};

export type RadialButtonLayout = {
  /** Outer wrapper position in parent-relative coords (parent's top-left = circle bbox top-left). */
  top: number;
  left: number;
  outerWidth: number;
  /** CSS mask value combining the radial clip + a vertical band at the circle edges. */
  mask: string;
  /**
   * Padding on the side of the inner button that the curve eats into, so the
   * visible content stays out of the masked area in the static (translateX=0)
   * state. Use `paddingLeft` for a right-side button, `paddingRight` for left.
   */
  paddingNear: number;
};

export function computeRadialButtonLayout(
  { side, yCenter, radius: r, buttonW, buttonH, outerExtraPx, minNearPaddingPx = 28 }: RadialButtonInput,
): RadialButtonLayout {
  const minPad = minNearPaddingPx;
  const halfH = buttonH / 2;
  const farY = Math.abs(yCenter) + halfH;
  const horizontalRadiusAtFarY = Math.sqrt(Math.max(0, r * r - farY * farY));

  const top = r + yCenter - halfH;
  const outerWidth = buttonW + outerExtraPx;

  // For a right-side button: outer extends LEFT of the visible button by
  // `outerExtraPx`. Its left edge sits at `circleCenter + horizontalRadius - outerExtra`,
  // so the inner (anchored to outer's right) sits flush against the curve.
  // Mirror for the left-side button.
  const left =
    side === "right"
      ? r + horizontalRadiusAtFarY - outerExtraPx
      : r - horizontalRadiusAtFarY - buttonW;

  // Mask centre, in outer-local coords (origin = outer's top-left).
  const maskCenterX =
    side === "right" ? outerExtraPx - horizontalRadiusAtFarY : horizontalRadiusAtFarY + buttonW;
  const maskCenterY = halfH - yCenter;

  const radialMask = `radial-gradient(circle at ${maskCenterX}px ${maskCenterY}px, transparent ${r - 0.5}px, black ${r + 0.5}px)`;

  // Vertical band corresponding to the circle's vertical extent — composited
  // with the radial mask via `mask-composite: intersect` so buttons sliding
  // past the circle's top/bottom get hard-clipped at the ring edge instead of
  // floating in the void.
  const verticalTop = maskCenterY - r;
  const verticalBottom = maskCenterY + r;
  const bandMask = `linear-gradient(to bottom, transparent ${verticalTop}px, black ${verticalTop}px, black ${verticalBottom}px, transparent ${verticalBottom}px)`;
  const mask = `${radialMask}, ${bandMask}`;

  // Furthest the curve reaches into the visible inner button — content must
  // start past that to avoid being clipped by the mask in the static state.
  const closestRowY = Math.max(0, Math.min(buttonH, maskCenterY));
  const yDelta = closestRowY - maskCenterY;
  const reach = Math.sqrt(Math.max(0, r * r - yDelta * yDelta));

  let paddingNear: number;
  if (side === "right") {
    const maxHiddenX = maskCenterX + reach;
    paddingNear = Math.max(minPad, maxHiddenX - outerExtraPx + minPad);
  } else {
    const minMaskLeftEdge = maskCenterX - reach;
    const intrusion = Math.max(0, buttonW - minMaskLeftEdge);
    paddingNear = Math.max(minPad, intrusion + minPad);
  }

  return { top, left, outerWidth, mask, paddingNear };
}

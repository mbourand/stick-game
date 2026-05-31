/**
 * Maps a beatmap difficulty rating to a color along an easy→hard spectrum, for
 * an at-a-glance read of difficulty across the selection UI. The scale matches
 * the 0–10 ★ rating shown elsewhere (and the difficulty filter): cool greens
 * for the easiest, warming through lime/yellow/orange/red, into magenta and
 * violet for the hardest. Ratings outside the range clamp to the spectrum ends.
 *
 * It's a perceptually monotonic ramp (no cool tone reappears mid-way), so a
 * harder map never reads as the same hue as an easier one. Calibrated so the
 * bundled starter maps (~1–5.5) already span green→red, leaving the warm/violet
 * top end as headroom for harder downloaded maps.
 */

type Rgb = readonly [number, number, number];

/** Spectrum anchors: rating → color, in ascending `at` order. */
const STOPS: readonly { at: number; rgb: Rgb }[] = [
  { at: 0.0, rgb: [0x63, 0xe6, 0xbe] }, // mint — easiest
  { at: 1.5, rgb: [0x51, 0xcf, 0x66] }, // green
  { at: 2.5, rgb: [0xa9, 0xe3, 0x4b] }, // lime
  { at: 3.5, rgb: [0xfc, 0xc4, 0x19] }, // yellow
  { at: 4.5, rgb: [0xff, 0x92, 0x2b] }, // orange
  { at: 5.5, rgb: [0xfa, 0x52, 0x52] }, // red
  { at: 6.5, rgb: [0xe6, 0x49, 0x80] }, // magenta
  { at: 7.5, rgb: [0xbe, 0x4b, 0xdb] }, // purple
  { at: 9.0, rgb: [0x70, 0x48, 0xe8] }, // violet — hardest
];

/** Top of the spectrum; aligns with the difficulty filter's slider max. */
export const DIFFICULTY_COLOR_MAX = STOPS[STOPS.length - 1].at;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Linearly interpolate the spectrum at `rating`, clamping to the end stops. */
function sample(rating: number): Rgb {
  if (!Number.isFinite(rating) || rating <= STOPS[0].at) return STOPS[0].rgb;
  const last = STOPS[STOPS.length - 1];
  if (rating >= last.at) return last.rgb;
  for (let i = 1; i < STOPS.length; i++) {
    const hi = STOPS[i];
    if (rating <= hi.at) {
      const lo = STOPS[i - 1];
      const t = (rating - lo.at) / (hi.at - lo.at);
      return [
        Math.round(lerp(lo.rgb[0], hi.rgb[0], t)),
        Math.round(lerp(lo.rgb[1], hi.rgb[1], t)),
        Math.round(lerp(lo.rgb[2], hi.rgb[2], t)),
      ];
    }
  }
  return last.rgb;
}

/** `rgb(...)` color for a difficulty rating. */
export function difficultyColor(rating: number): string {
  const [r, g, b] = sample(rating);
  return `rgb(${r}, ${g}, ${b})`;
}

/** `rgba(...)` color for a difficulty rating at the given alpha (0–1). */
export function difficultyColorRgba(rating: number, alpha: number): string {
  const [r, g, b] = sample(rating);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * CSS `linear-gradient(...)` spanning the whole spectrum, with each anchor
 * placed at its proportion of `max`. Used to paint the difficulty filter track
 * so the slider reads as the difficulty spectrum itself.
 */
export function difficultyGradientCss(direction = "to right", max = DIFFICULTY_COLOR_MAX): string {
  const stops = STOPS.map(({ at, rgb }) => {
    const pct = Math.min(100, Math.max(0, (at / max) * 100));
    return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]}) ${pct.toFixed(1)}%`;
  });
  return `linear-gradient(${direction}, ${stops.join(", ")})`;
}

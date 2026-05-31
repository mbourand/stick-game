type RawGrades = "SSS" | "SS" | "S" | "A" | "B" | "C" | "D";
export type Grade = RawGrades | Exclude<`${RawGrades}+`, "SSS+">;

/**
 * Base accuracy thresholds, best → worst. Single source of truth for both the
 * grade computation and the reference lines drawn on the accuracy graph. The
 * "+" variants don't add accuracy lines — they're a no-miss upgrade of SS / S.
 */
export const GRADE_THRESHOLDS: { grade: RawGrades; accuracy: number }[] = [
  { grade: "SSS", accuracy: 100 },
  { grade: "SS", accuracy: 98 },
  { grade: "S", accuracy: 96 },
  { grade: "A", accuracy: 93 },
  { grade: "B", accuracy: 88 },
  { grade: "C", accuracy: 80 },
];

/**
 * Maps a finished play to a grade. `accuracy` is the 0–100 value from
 * `ScoreCounter.getAccuracy()`. A flawless (no-miss) run upgrades SS → SS+ and
 * S → S+; SSS is already perfect, lower tiers don't get a "+".
 */
export function computeGrade(accuracy: number, missCount: number): Grade {
  const base = GRADE_THRESHOLDS.find((t) => accuracy >= t.accuracy)?.grade ?? "D";
  if (missCount === 0 && base !== "SSS") return `${base}+`;
  return base;
}

/** Accent color per grade, used for the hero letter + glow and the graph's grade lines. */
export const GRADE_COLOR: Record<Grade, string> = {
  SSS: "#ffe9a8",
  "SS+": "#ffdf6b",
  SS: "#ffd23a",
  "S+": "#ffc24d",
  S: "#ffb13d",
  "A+": "#7ee081",
  A: "#7ee081",
  "B+": "#69b4ff",
  B: "#69b4ff",
  "C+": "#c98bff",
  C: "#c98bff",
  "D+": "#ff6b6b",
  D: "#ff6b6b",
};

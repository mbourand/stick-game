import { computeGrade, GRADE_COLOR } from "@/modules/game/score/grade";

type ScoreRowProps = {
  rank: number;
  playerName: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  /** Miss count for the play — used (with accuracy) to derive the displayed grade. */
  missCount: number;
  /** Human-readable mod summary (e.g. "Rate ×1.50"); shown as a badge when non-empty. */
  mods?: string;
  /** Highlights the row as the local player's own score (e.g. the just-played run). */
  highlighted?: boolean;
};

export const ScoreRow = ({ rank, playerName, score, accuracy, maxCombo, missCount, mods, highlighted = false }: ScoreRowProps) => {
  const grade = computeGrade(accuracy, missCount);
  return (
    <li
      className={`flex items-center gap-3 px-2 py-1.5 rounded ${
        highlighted
          ? "bg-white/15 ring-1 ring-white/40 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
          : "hover:bg-white/5"
      }`}
    >
      <span className="text-xs text-white/40 tabular-nums w-5 text-right">{rank}</span>
      <span
        className="w-9 text-center text-sm font-bold"
        style={{ color: GRADE_COLOR[grade], textShadow: `0 0 10px ${GRADE_COLOR[grade]}66` }}
      >
        {grade}
      </span>
      {/* Name owns the full flexible column; the mod tag sits on its own line
          beneath it so a long "Rate ×1.50" never squeezes the name. */}
      <span className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
        <span className="truncate text-sm text-white/90 tracking-wide">{playerName}</span>
        {mods ? (
          <span className="truncate text-[9px] uppercase tracking-[0.15em] text-amber-300/80">{mods}</span>
        ) : null}
      </span>
      <span className="text-sm text-white/90 tabular-nums">{formatScore(score)}</span>
      <span className="text-xs text-white/50 tabular-nums w-12 text-right">{accuracy.toFixed(1)}%</span>
      <span className="text-xs text-white/50 tabular-nums w-10 text-right">{maxCombo}x</span>
    </li>
  );
};

function formatScore(score: number): string {
  return score
    .toString()
    .split("")
    .flatMap((c, i, a) => (i && (a.length - i) % 3 === 0 ? [" ", c] : [c]))
    .join("");
}

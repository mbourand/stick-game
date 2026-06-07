import { forwardRef } from "react";
import { computeGrade, GRADE_COLOR } from "@/modules/game/score/grade";
import { Avatar } from "@/components/Avatar";

type ScoreRowProps = {
  rank: number;
  playerName: string;
  /** Account avatar URL; null/absent falls back to the player's initial. */
  avatarUrl?: string | null;
  score: number;
  accuracy: number;
  maxCombo: number;
  /** Miss count for the play — used (with accuracy) to derive the displayed grade. */
  missCount: number;
  /** Human-readable mod summary (e.g. "Rate ×1.50"); folded into the stat line when non-empty. */
  mods?: string;
  /** Highlights the row as the player's own score (e.g. the just-played run). */
  highlighted?: boolean;
  /** Marks the row as the controller cursor's current target (full leaderboard view). */
  focused?: boolean;
};

/**
 * One leaderboard row. The name owns the whole flexible middle column and the
 * secondary stats (accuracy · combo · mods) drop onto a line beneath it, so even
 * a long name keeps its room instead of being squeezed by the stat columns. The
 * score stays pinned to the right.
 */
export const ScoreRow = forwardRef<HTMLLIElement, ScoreRowProps>(function ScoreRow(
  { rank, playerName, avatarUrl, score, accuracy, maxCombo, missCount, mods, highlighted = false, focused = false },
  ref,
) {
  const grade = computeGrade(accuracy, missCount);
  const state = focused
    ? "bg-white/10 ring-2 ring-white/70"
    : highlighted
      ? "bg-white/15 ring-1 ring-white/40 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
      : "hover:bg-white/5";
  return (
    <li ref={ref} className={`flex items-center gap-3 px-2 py-1.5 rounded ${state}`}>
      <span className="w-6 text-right text-xs text-white/40 tabular-nums">{rank}</span>
      <span
        className="w-8 text-center text-sm font-bold"
        style={{ color: GRADE_COLOR[grade], textShadow: `0 0 10px ${GRADE_COLOR[grade]}66` }}
      >
        {grade}
      </span>
      <Avatar src={avatarUrl} name={playerName} size={28} />
      <div className="flex-1 min-w-0 flex flex-col justify-center leading-tight">
        <span className="truncate text-sm text-white/90 tracking-wide">{playerName}</span>
        <span className="truncate text-[10px] tabular-nums text-white/45">
          {accuracy.toFixed(1)}% · {maxCombo}x
          {mods ? <span className="text-amber-300/80"> · {mods}</span> : null}
        </span>
      </div>
      <span className="shrink-0 text-sm text-white/90 tabular-nums">{formatScore(score)}</span>
    </li>
  );
});

/** Group a score's digits into space-separated thousands (e.g. "12 345 678"). */
export function formatScore(score: number): string {
  return score
    .toString()
    .split("")
    .flatMap((c, i, a) => (i && (a.length - i) % 3 === 0 ? [" ", c] : [c]))
    .join("");
}

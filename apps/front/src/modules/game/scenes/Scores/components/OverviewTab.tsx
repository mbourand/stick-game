import { JudgmentKind } from "../../../judge/constants";
import type { ScoreCounter } from "../../../score/ScoreCounter";

/** Judgment rows, top → bottom, with the same colors gameplay uses for hit flair. */
const JUDGMENTS: { kind: JudgmentKind; label: string; color: string }[] = [
  { kind: JudgmentKind.Perfect, label: "Perfect", color: "#22d3ee" },
  { kind: JudgmentKind.Good, label: "Good", color: "#a3e635" },
  { kind: JudgmentKind.Meh, label: "Meh", color: "#fbbf24" },
  { kind: JudgmentKind.Miss, label: "Miss", color: "#f87171" },
];

export const OverviewTab = ({ scoreCounter }: { scoreCounter: ScoreCounter }) => {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      <div className="grid grid-cols-2 gap-x-10 gap-y-2.5">
        {JUDGMENTS.map(({ kind, label, color }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}aa` }} />
            <span className="flex-1 text-sm tracking-[0.2em] uppercase text-white/60">{label}</span>
            <span className="text-xl tabular-nums text-white/90 min-w-[3ch] text-right">
              {scoreCounter.getJudgmentCount(kind)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-1 flex items-baseline gap-3">
        <span className="text-sm tracking-[0.25em] uppercase text-white/50">Max combo</span>
        <span className="text-3xl tabular-nums">{scoreCounter.getMaxCombo()}x</span>
      </div>
    </div>
  );
};

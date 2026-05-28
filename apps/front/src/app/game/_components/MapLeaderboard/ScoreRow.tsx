type ScoreRowProps = {
  rank: number;
  playerName: string;
  score: number;
  accuracy: number;
  maxCombo: number;
};

export const ScoreRow = ({ rank, playerName, score, accuracy, maxCombo }: ScoreRowProps) => {
  return (
    <li className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-white/5">
      <span className="text-xs text-white/40 tabular-nums w-5 text-right">{rank}</span>
      <span className="flex-1 truncate text-sm text-white/90 tracking-wide">{playerName}</span>
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

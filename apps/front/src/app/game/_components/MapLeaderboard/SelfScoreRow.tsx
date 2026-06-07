import { Avatar } from "@/components/Avatar";
import { formatScore } from "./ScoreRow";

type SelfScoreRowProps = {
  rank: number;
  playerName: string;
  /** Account avatar URL; null/absent falls back to the player's initial. */
  avatarUrl?: string | null;
  score: number;
};

/**
 * The inner content of a "your score" row — a "You" label, the player's avatar +
 * name, and their rank + score. Layout-agnostic (just the cells): each caller
 * wraps it in its own container so the pinned footer can size itself for the
 * fixed-height full board or the compact in-scores Rank tab.
 */
export const SelfScoreRow = ({ rank, playerName, avatarUrl, score }: SelfScoreRowProps) => (
  <>
    <span className="w-9 text-center text-[10px] uppercase tracking-[0.15em] text-white/45">You</span>
    <Avatar src={avatarUrl} name={playerName} size={30} />
    <span className="flex-1 min-w-0 truncate text-sm text-white/90 tracking-wide">{playerName}</span>
    <span className="flex items-baseline gap-2.5 tabular-nums">
      <span className="text-base font-semibold text-white/90">#{rank}</span>
      <span className="text-base font-semibold text-white/90">{formatScore(score)}</span>
    </span>
  </>
);

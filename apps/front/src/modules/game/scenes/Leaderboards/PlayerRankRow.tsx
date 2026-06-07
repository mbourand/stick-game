import { Avatar } from "@/components/Avatar";

/** Top-three rank accents (gold / silver / bronze); lower ranks read muted. */
const MEDAL_COLOR: Record<number, string> = { 1: "#ffd23a", 2: "#d6dde6", 3: "#cd8b5b" };

type PlayerRankRowProps = {
  rank: number;
  name: string;
  /** Account avatar URL; null/absent falls back to the player's initial. */
  avatarUrl?: string | null;
  value: number;
  /** Short unit after the value (e.g. "SSS", "plays"). */
  unit: string;
  /** Optional accent colour for the value (grade boards tint it). */
  accent?: string;
  /** Highlights the row as the signed-in player. */
  highlighted?: boolean;
};

export const PlayerRankRow = ({ rank, name, avatarUrl, value, unit, accent, highlighted = false }: PlayerRankRowProps) => {
  const medal = MEDAL_COLOR[rank];
  return (
    <li
      className={`flex items-center gap-3 px-3 py-2 rounded ${
        highlighted ? "bg-white/15 ring-1 ring-white/40" : "hover:bg-white/5"
      }`}
    >
      <span
        className="w-7 text-right text-sm font-bold tabular-nums"
        style={medal ? { color: medal, textShadow: `0 0 10px ${medal}66` } : { color: "rgba(255,255,255,0.4)" }}
      >
        {rank}
      </span>
      <Avatar src={avatarUrl} name={name} size={30} />
      <span className="flex-1 min-w-0 truncate text-sm text-white/90 tracking-wide">{name}</span>
      <span className="text-base font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
        {value.toLocaleString()}
      </span>
      <span className="w-12 text-[10px] uppercase tracking-[0.2em] text-white/40">{unit}</span>
    </li>
  );
};

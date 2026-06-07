import { Avatar } from "@/components/Avatar";
import type { PlayerRankEntry } from "@/modules/fetching/back/queries/player-rankings";

/** Gold / silver / bronze accents for the three podium places. */
const MEDAL_COLOR: Record<1 | 2 | 3, string> = { 1: "#ffd23a", 2: "#d6dde6", 3: "#cd8b5b" };

/** Per-place sizing — first place is taller and larger so it reads as the winner. */
const PLACE_STYLE: Record<1 | 2 | 3, { avatar: number; pedestal: number }> = {
  1: { avatar: 78, pedestal: 64 },
  2: { avatar: 60, pedestal: 42 },
  3: { avatar: 60, pedestal: 30 },
};

type PodiumProps = {
  /** Top entries (already rank-sorted); only the first three are shown. */
  entries: PlayerRankEntry[];
  unit: string;
  accent: string;
  selfId: string | null;
};

/**
 * The top-three showcase above the ranked list: medal-ringed avatars on three
 * pedestals, the winner raised in the centre. Render order is silver · gold ·
 * bronze so the tallest pedestal sits in the middle; `items-end` lines their
 * bases up so the differing heights lift each column to its podium level.
 */
export const Podium = ({ entries, unit, accent, selfId }: PodiumProps) => {
  // Visual left-to-right order: 2nd, 1st, 3rd. Missing places (a board with
  // fewer than three ranked players) simply drop out.
  const order = [entries[1], entries[0], entries[2]];

  return (
    <div className="flex items-end justify-center gap-3">
      {order.map((entry) =>
        entry ? (
          <Place key={entry.userId} entry={entry} unit={unit} accent={accent} isSelf={entry.userId === selfId} />
        ) : null,
      )}
    </div>
  );
};

const Place = ({
  entry,
  unit,
  accent,
  isSelf,
}: {
  entry: PlayerRankEntry;
  unit: string;
  accent: string;
  isSelf: boolean;
}) => {
  const place = entry.rank as 1 | 2 | 3;
  const medal = MEDAL_COLOR[place];
  const { avatar, pedestal } = PLACE_STYLE[place];

  return (
    <div className="flex flex-col items-center" style={{ width: place === 1 ? 150 : 128 }}>
      <div className="relative" style={{ filter: `drop-shadow(0 0 12px ${medal}55)` }}>
        <div
          className="rounded-full p-0.5"
          style={{ background: medal, boxShadow: isSelf ? `0 0 0 3px rgba(255,255,255,0.55)` : undefined }}
        >
          <Avatar src={entry.avatarUrl} name={entry.username} size={avatar} className="border-black/40" />
        </div>
        {/* Rank pip tucked at the avatar's base, in the medal colour. */}
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold text-black/85 tabular-nums"
          style={{ background: medal, boxShadow: `0 0 10px ${medal}88` }}
        >
          {place}
        </span>
      </div>

      <span className="mt-3 max-w-full truncate text-sm text-white/90 tracking-wide" title={entry.username}>
        {entry.username}
      </span>
      <span className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: accent }}>
        {entry.value.toLocaleString()}
        <span className="ml-1 text-[10px] uppercase tracking-[0.2em] text-white/40 align-middle">{unit}</span>
      </span>

      {/* The pedestal block — height encodes the place; a faint ghost numeral fills it. */}
      <div
        className="mt-3 w-full rounded-t flex items-start justify-center pt-1 overflow-hidden"
        style={{
          height: pedestal,
          background: `linear-gradient(to bottom, ${medal}22, transparent)`,
          borderTop: `2px solid ${medal}`,
        }}
      >
        <span className="text-2xl font-bold tabular-nums" style={{ color: `${medal}33` }}>
          {place}
        </span>
      </div>
    </div>
  );
};

import { Avatar } from "@/components/Avatar";
import { computeGrade, GRADE_COLOR } from "@/modules/game/score/grade";
import { formatScore } from "@/app/game/_components/MapLeaderboard/ScoreRow";
import type { LeaderboardRow } from "./useBeatmapLeaderboardRows";

/** Gold / silver / bronze accents for the three podium places. */
const MEDAL_COLOR: Record<1 | 2 | 3, string> = { 1: "#ffd23a", 2: "#d6dde6", 3: "#cd8b5b" };

/** Per-place sizing — first place is taller and larger so it reads as the winner. */
const PLACE_STYLE: Record<1 | 2 | 3, { avatar: number; pedestal: number }> = {
  1: { avatar: 78, pedestal: 64 },
  2: { avatar: 60, pedestal: 42 },
  3: { avatar: 60, pedestal: 30 },
};

/**
 * The top-three showcase above the ranked list: medal-ringed avatars on three
 * pedestals with their grade + score, the winner raised in the centre. Mirrors
 * the player-rankings Podium so the two boards read as one family. `currentRank`
 * (the just-played run's rank, when it lands in the top three) gets a white ring.
 */
export const ScorePodium = ({ entries, currentRank }: { entries: LeaderboardRow[]; currentRank: number | null }) => {
  // Visual left-to-right order: 2nd · 1st · 3rd. Missing places (fewer than three
  // scores) simply drop out; `items-end` lines their bases up so the pedestal
  // heights lift each column to its level.
  const order: ({ entry: LeaderboardRow; place: 1 | 2 | 3 } | null)[] = [
    entries[1] ? { entry: entries[1], place: 2 } : null,
    entries[0] ? { entry: entries[0], place: 1 } : null,
    entries[2] ? { entry: entries[2], place: 3 } : null,
  ];

  return (
    <div className="flex items-end justify-center gap-3">
      {order.map((slot) =>
        slot ? <Place key={slot.place} entry={slot.entry} place={slot.place} isCurrent={slot.place === currentRank} /> : null,
      )}
    </div>
  );
};

const Place = ({ entry, place, isCurrent }: { entry: LeaderboardRow; place: 1 | 2 | 3; isCurrent: boolean }) => {
  const medal = MEDAL_COLOR[place];
  const { avatar, pedestal } = PLACE_STYLE[place];
  const grade = computeGrade(entry.accuracy, entry.missCount);

  return (
    <div className="flex flex-col items-center" style={{ width: place === 1 ? 168 : 140 }}>
      <div className="relative" style={{ filter: `drop-shadow(0 0 12px ${medal}55)` }}>
        <div
          className="rounded-full p-0.5"
          style={{ background: medal, boxShadow: isCurrent ? `0 0 0 3px rgba(255,255,255,0.55)` : undefined }}
        >
          <Avatar src={entry.avatarUrl} name={entry.playerName} size={avatar} className="border-black/40" />
        </div>
        {/* Rank pip tucked at the avatar's base, in the medal colour. */}
        <span
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold text-black/85 tabular-nums"
          style={{ background: medal, boxShadow: `0 0 10px ${medal}88` }}
        >
          {place}
        </span>
      </div>

      <span className="mt-3 max-w-full truncate text-sm text-white/90 tracking-wide" title={entry.playerName}>
        {entry.playerName}
      </span>
      <span
        className="mt-0.5 text-xs font-bold"
        style={{ color: GRADE_COLOR[grade], textShadow: `0 0 8px ${GRADE_COLOR[grade]}66` }}
      >
        {grade}
      </span>
      <span className="mt-0.5 text-base font-semibold tabular-nums text-white/90">{formatScore(entry.score)}</span>
      <span className="text-[10px] tabular-nums text-white/45">
        {entry.accuracy.toFixed(1)}% · {entry.maxCombo}x
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

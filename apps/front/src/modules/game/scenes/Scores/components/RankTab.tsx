import { ScoreRow } from "@/app/game/_components/MapLeaderboard/ScoreRow";
import { LEADERBOARD_TABS, type LeaderboardTab } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useStore } from "../../../engine/state/useStore";
import { useAuth } from "@/modules/auth/useAuth";
import type { ScoresScene, SubmissionState } from "../ScoresScene";

/** Approximate per-row stride (row height + gap) for centering the player's row. */
const ROW_STRIDE = 36;

const TAB_LABEL: Record<LeaderboardTab, string> = { global: "Global", modded: "Modded", local: "Local" };

type Row = {
  key: string;
  playerName: string;
  avatarUrl?: string | null;
  score: number;
  accuracy: number;
  maxCombo: number;
  missCount: number;
  mods?: string;
};

export const RankTab = ({ scene }: { scene: ScoresScene }) => {
  const tab = useStore(scene.leaderboardTab);
  const submission = useStore(scene.submission);
  const session = useAuth();
  const playerScore = scene.scoreCounter.getScore();

  const localQuery = useQuery(
    localScoresBeatmapLeaderboardQueryOptions(scene.parsedMap.id, LATEST_SCORE_VERSION),
  );
  const noModsQuery = useQuery(
    scoresBeatmapLeaderboardQueryOptions(scene.parsedMap.id, LATEST_SCORE_VERSION, false),
  );
  const moddedQuery = useQuery(
    scoresBeatmapLeaderboardQueryOptions(scene.parsedMap.id, LATEST_SCORE_VERSION, true),
  );

  const isLocal = tab === "local";
  const globalQuery = tab === "modded" ? moddedQuery : noModsQuery;
  const query = isLocal ? localQuery : globalQuery;

  const rows: Row[] = isLocal
    ? (localQuery.data ?? []).map((e) => ({
        key: String(e.id),
        playerName: e.playerName,
        // Only the current account's own rows get an avatar — the live session
        // one; guests and other accounts fall back to the default disc.
        avatarUrl: session && e.userId === session.user.id ? session.user.avatarUrl : null,
        score: e.score,
        accuracy: e.accuracy,
        maxCombo: e.maxCombo,
        missCount: e.missCount,
        mods: e.mods,
      }))
    : (globalQuery.data?.leaderboard ?? []).map((e, i) => ({
        key: `${e.userId}-${i}`,
        playerName: e.username,
        avatarUrl: e.avatarUrl,
        score: e.score,
        accuracy: e.accuracy,
        maxCombo: e.maxCombo,
        missCount: e.missCount,
        mods: e.mods,
      }));

  const playerIndex = isLocal
    ? (localQuery.data ?? []).findIndex((e) => e.id === submission.localId)
    : (globalQuery.data?.leaderboard ?? []).findIndex(
        (e) => e.userId === session?.user.id && e.score === playerScore,
      );

  const placement = isLocal
    ? localPlacement(submission, playerIndex, rows.length)
    : globalPlacement(submission, playerIndex);

  return (
    <div className="h-full flex flex-col items-center gap-3 w-full">
      <Toggle scene={scene} tab={tab} />
      <Placement label={TAB_LABEL[tab]} value={placement} />

      <div className="w-full flex-1 min-h-0">
        {query.isLoading ? (
          <Status text="Loading…" />
        ) : query.isError ? (
          <Status text={isLocal ? "Failed to load" : "Offline"} />
        ) : rows.length === 0 ? (
          <Status text="No scores yet" />
        ) : (
          <LeaderboardList key={tab} rows={rows} playerIndex={playerIndex} />
        )}
      </div>
    </div>
  );
};

const Toggle = ({
  scene,
  tab,
}: {
  scene: ScoresScene;
  tab: LeaderboardTab;
}) => (
  <div className="flex items-center gap-3 text-xs tracking-[0.25em] uppercase pointer-events-auto">
    <BumperHint label="L" />
    {LEADERBOARD_TABS.map((id) => (
      <button
        key={id}
        type="button"
        onClick={() => scene.leaderboardTab.set(id)}
        className={`transition-colors duration-150 ${
          tab === id ? "text-white" : "text-white/40 hover:text-white/70"
        }`}
      >
        {id}
      </button>
    ))}
    <BumperHint label="R" />
  </div>
);

/**
 * Full ranked list, scrollable within the fixed tab body so a long local
 * history never pushes the layout out of the circle. The player's own row is
 * centered into view on mount.
 */
const LeaderboardList = ({ rows, playerIndex }: { rows: Row[]; playerIndex: number }) => {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (!el || playerIndex < 0) return;
    el.scrollTop = Math.max(0, playerIndex * ROW_STRIDE - el.clientHeight / 2 + ROW_STRIDE / 2);
  }, [playerIndex]);

  return (
    <ol
      ref={listRef}
      // px/py give the highlighted row's ring room to breathe — overflow-y-auto
      // clips horizontally too, so a flush ring would have its left edge cropped.
      className="h-full overflow-y-auto flex flex-col gap-1 px-2 py-0.5"
      style={{ scrollbarWidth: "thin" }}
    >
      {rows.map((row, i) => (
        <ScoreRow
          key={row.key}
          rank={i + 1}
          playerName={row.playerName}
          avatarUrl={row.avatarUrl}
          score={row.score}
          accuracy={row.accuracy}
          maxCombo={row.maxCombo}
          missCount={row.missCount}
          mods={row.mods}
          highlighted={i === playerIndex}
        />
      ))}
    </ol>
  );
};

const Placement = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-baseline gap-2">
    <span className="text-[11px] tracking-[0.3em] uppercase text-white/45">{label}</span>
    <span className="text-2xl tabular-nums">{value}</span>
  </div>
);

const Status = ({ text }: { text: string }) => (
  <div className="text-center text-xs text-white/45 tracking-[0.2em] uppercase py-6">{text}</div>
);

const BumperHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-6 h-5 px-1.5 rounded border border-white/30 text-[10px] font-bold tracking-wider text-white/70"
    aria-hidden
  >
    {label}
  </span>
);

function localPlacement(submission: SubmissionState, playerIndex: number, total: number): string {
  if (submission.status === "saving") return "Saving…";
  if (submission.localId === null) return "Not saved";
  if (playerIndex < 0) return "Updating…";
  return `#${playerIndex + 1} / ${total}`;
}

function globalPlacement(submission: SubmissionState, playerIndex: number): string {
  if (submission.status === "saving") return "Saving…";
  if (!submission.loggedIn) return "Sign in to rank";
  if (submission.globalError) return "Offline";
  if (!submission.uploadedGlobal) return "Not ranked";
  if (playerIndex < 0) return "Unranked";
  return `#${playerIndex + 1}`;
}

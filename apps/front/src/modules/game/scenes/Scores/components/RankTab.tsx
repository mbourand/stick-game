"use client";

import { ScoreRow } from "@/app/game/_components/MapLeaderboard/ScoreRow";
import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useStore } from "../../../engine/state/useStore";
import type { ScoresScene, SubmissionState } from "../ScoresScene";

/** Approximate per-row stride (row height + gap) for centering the player's row. */
const ROW_STRIDE = 36;

type Row = { key: string; playerName: string; score: number; accuracy: number; maxCombo: number; missCount: number };

export const RankTab = ({ scene }: { scene: ScoresScene }) => {
  const tab = useStore(scene.leaderboardTab);
  const submission = useStore(scene.submission);
  const playerScore = scene.scoreCounter.getScore();

  const localQuery = useQuery(
    localScoresBeatmapLeaderboardQueryOptions(scene.parsedMap.id, LATEST_SCORE_VERSION),
  );
  const globalQuery = useQuery(
    scoresBeatmapLeaderboardQueryOptions(scene.parsedMap.id, LATEST_SCORE_VERSION),
  );

  const isGlobal = tab === "global";
  const query = isGlobal ? globalQuery : localQuery;

  const rows: Row[] = isGlobal
    ? (globalQuery.data?.leaderboard ?? []).map((e, i) => ({
        key: `${e.playerName}-${i}`,
        playerName: e.playerName,
        score: e.score,
        accuracy: e.accuracy,
        maxCombo: e.maxCombo,
        missCount: e.missCount,
      }))
    : (localQuery.data ?? []).map((e) => ({
        key: String(e.id),
        playerName: e.playerName,
        score: e.score,
        accuracy: e.accuracy,
        maxCombo: e.maxCombo,
        missCount: e.missCount,
      }));

  const playerIndex = isGlobal
    ? (globalQuery.data?.leaderboard ?? []).findIndex(
        (e) => e.playerName === scene.playerName && e.score === playerScore,
      )
    : (localQuery.data ?? []).findIndex((e) => e.id === submission.localId);

  const placement = isGlobal
    ? globalPlacement(submission, playerIndex)
    : localPlacement(submission, playerIndex, rows.length);

  return (
    <div className="h-full flex flex-col items-center gap-3 w-full">
      <Toggle scene={scene} tab={tab} />
      <Placement label={isGlobal ? "Global" : "Local"} value={placement} />

      <div className="w-full flex-1 min-h-0">
        {query.isLoading ? (
          <Status text="Loading…" />
        ) : query.isError ? (
          <Status text={isGlobal ? "Offline" : "Failed to load"} />
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
  tab: "global" | "local";
}) => (
  <div className="flex items-center gap-3 text-xs tracking-[0.25em] uppercase pointer-events-auto">
    <BumperHint label="L" />
    {(["local", "global"] as const).map((id) => (
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
          score={row.score}
          accuracy={row.accuracy}
          maxCombo={row.maxCombo}
          missCount={row.missCount}
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
  if (submission.globalError) return "Offline";
  if (!submission.uploadedGlobal) return "Not ranked";
  if (playerIndex < 0) return "Unranked";
  return `#${playerIndex + 1}`;
}

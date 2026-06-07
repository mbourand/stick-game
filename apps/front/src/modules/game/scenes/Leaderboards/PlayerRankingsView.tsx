import { AnimatePresence, motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import type { PlayerRankEntry } from "@/modules/fetching/back/queries/player-rankings";
import { useAuth } from "@/modules/auth/useAuth";
import { myPlayerRankQueryOptions, playerRankingsQueryOptions } from "@/modules/fetching/back/queries/player-rankings";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { HintBar } from "../shared/KeyHint";
import type { SceneUIComponent } from "../Scene";
import { BoardTabs } from "./BoardTabs";
import { PLAYER_RANKING_META, type PlayerRankingMetric } from "./metrics";
import { PlayerRankRow } from "./PlayerRankRow";
import { Podium } from "./Podium";
import type { PlayerRankingsScene } from "./PlayerRankingsScene";

// How far a board slides as it cross-fades when switching tabs. Kept under the
// panel's padding (p-7 = 28px) so the off-panel travel tucks into the padding —
// no overflow clip needed, which would otherwise crop a long list vertically.
const SLIDE = 24;

export const PlayerRankingsView: SceneUIComponent<PlayerRankingsScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));
  const hintMotion = useScenePresenceMotion(fade({ y: 12 }));
  const { scale } = useViewport();
  const session = useAuth();
  const metric = useStore(scene.metric);
  const meta = PLAYER_RANKING_META[metric];

  // Read at animation time so the *exiting* board uses the live direction too —
  // pressing right slides out left / in from right, left mirrors it.
  const boardVariants = {
    enter: () => ({ x: scene.tabDirection >= 0 ? SLIDE : -SLIDE, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: () => ({ x: scene.tabDirection >= 0 ? -SLIDE : SLIDE, opacity: 0 }),
  };

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="w-[600px] flex flex-col text-white p-7 rounded-lg border border-white/10 bg-white/[0.02]"
          {...panelMotion}
        >
          <header className="border-b border-white/10 pb-3">
            <BoardTabs scene={scene} active={metric} />
          </header>

          {/* Grid-stack (not absolute) so the container grows with the board's
              content — podium + a scrollable list. Both boards share the one
              grid cell during the cross-fade; no overflow clip, so the list is
              never cropped (the slide stays within the panel padding). */}
          <div className="grid mt-5" style={{ minHeight: 340 }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={metric}
                className="flex flex-col"
                style={{ gridArea: "1 / 1" }}
                variants={boardVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              >
                <p className="text-center text-xs text-white/45 tracking-wide mb-5">{meta.blurb}</p>
                <Board metric={metric} unit={meta.unit} accent={meta.accent} selfId={session?.user.id ?? null} />
              </motion.div>
            </AnimatePresence>
          </div>

          {session && <YourRank metric={metric} unit={meta.unit} accent={meta.accent} />}
        </motion.div>

        <motion.div
          className="mt-7 flex items-center gap-5 text-[11px] text-white/40 tracking-[0.35em] uppercase"
          {...hintMotion}
        >
          <HintBar items={[{ key: "LR", label: "Switch board" }, { key: "B", label: "Back" }]} />
        </motion.div>
      </div>
    </motion.div>
  );
};

const Board = ({
  metric,
  unit,
  accent,
  selfId,
}: {
  metric: PlayerRankingMetric;
  unit: string;
  accent: string;
  selfId: string | null;
}) => {
  const query = useQuery(playerRankingsQueryOptions(metric));

  if (query.isLoading) return <Status text="Loading…" />;
  if (query.isError) return <Status text="Failed to load" />;
  const entries = query.data?.entries ?? [];
  if (entries.length === 0) return <Status text="No ranked players yet" />;

  const rest = entries.slice(3);

  return (
    <div className="flex flex-col min-h-0">
      <Podium entries={entries} unit={unit} accent={accent} selfId={selfId} />
      {rest.length > 0 && <RankList rows={rest} unit={unit} accent={accent} selfId={selfId} />}
    </div>
  );
};

/**
 * The ranked list below the podium (places #4 and down). Always starts at the
 * top (#4) and scrolls within a capped height so a long board never pushes the
 * panel off-screen; the signed-in player's row is still highlighted in place.
 */
const RankList = ({
  rows,
  unit,
  accent,
  selfId,
}: {
  rows: PlayerRankEntry[];
  unit: string;
  accent: string;
  selfId: string | null;
}) => {
  return (
    <div className="mt-5 pt-4 border-t border-white/10">
      <p className="mb-2 px-1 text-[10px] uppercase tracking-[0.3em] text-white/30">Rankings</p>
      <ol className="flex flex-col gap-0.5 max-h-[26vh] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
        {rows.map((entry) => (
          <PlayerRankRow
            key={entry.userId}
            rank={entry.rank}
            name={entry.username}
            avatarUrl={entry.avatarUrl}
            value={entry.value}
            unit={unit}
            accent={accent}
            highlighted={entry.userId === selfId}
          />
        ))}
      </ol>
    </div>
  );
};

const YourRank = ({ metric, unit, accent }: { metric: PlayerRankingMetric; unit: string; accent: string }) => {
  const session = useAuth();
  const query = useQuery(myPlayerRankQueryOptions(metric, true));
  const standing = query.data;
  const user = session?.user;
  const ranked = standing && standing.rank > 0;

  return (
    <div
      className="mt-5 flex items-center gap-3 px-3 py-2.5 rounded-md border border-white/10 bg-white/[0.04]"
      style={ranked ? { borderColor: `${accent}55` } : undefined}
    >
      <span className="w-9 text-center text-[10px] uppercase tracking-[0.15em] text-white/45">You</span>
      <Avatar src={user?.avatarUrl} name={user?.username ?? "?"} size={30} />
      <span className="flex-1 min-w-0 truncate text-sm text-white/90 tracking-wide">{user?.username}</span>

      {!standing || query.isLoading ? (
        <span className="text-white/35 text-sm">…</span>
      ) : !ranked ? (
        <span className="text-white/40 text-xs tracking-wide uppercase">Unranked</span>
      ) : (
        <span className="flex items-baseline gap-2.5 tabular-nums">
          <span className="text-base font-semibold text-white/90">#{standing.rank.toLocaleString()}</span>
          <span className="text-base font-semibold" style={{ color: accent }}>
            {standing.value.toLocaleString()}
            <span className="ml-1 text-[10px] uppercase tracking-[0.2em] text-white/40 align-middle">{unit}</span>
          </span>
        </span>
      )}
    </div>
  );
};

const Status = ({ text }: { text: string }) => (
  <div className="flex-1 flex items-center justify-center text-xs text-white/50 tracking-[0.2em] uppercase py-8">
    {text}
  </div>
);

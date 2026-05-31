import { beatmapsetsSearchQueryOptions } from "@/modules/fetching/back/queries/beatmapsets-search";
import { debounce } from "@/modules/utils/debounce";
import type { zOsuControllerBeatmapsetsSearchResponse } from "@tau/back-schemas";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import type { SceneUIComponent } from "../Scene";
import { getInstallStatusStore, startBeatmapsetInstall } from "./beatmapInstallStore";
import { InstallStatusIcon, installPhaseLabel, RowProgressBar } from "./BeatmapsetInstallProgress";
import type { DownloaderScene } from "./DownloaderScene";

type Beatmapset = z.infer<typeof zOsuControllerBeatmapsetsSearchResponse>["beatmapsets"][number];

export const DownloaderView: SceneUIComponent<DownloaderScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));

  const focused = useStore(scene.focused);
  const { scale } = useViewport();

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const debouncedSetQuery = useMemo(() => debounce((s: string) => setQuery(s), 300), []);
  const searchResults = useQuery(beatmapsetsSearchQueryOptions(query));
  const beatmapsets = searchResults.data?.beatmapsets ?? [];

  // Reset focus to the top when the underlying result set changes (in-render
  // adjustment is preferred over an effect for prop-derived state).
  const [prevData, setPrevData] = useState(searchResults.data);
  if (prevData !== searchResults.data) {
    setPrevData(searchResults.data);
    scene.focused.set(0);
  }

  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Push the current list count + the per-row confirm handler into the scene.
  // The scene's d-pad confirm / A button uses this to fire the right download
  // without ever touching React Query.
  useEffect(() => {
    scene.setListContext({
      count: beatmapsets.length,
      onConfirm: (index) => rowRefs.current[index]?.click(),
    });
    return () => scene.resetListContext();
  }, [beatmapsets.length, scene]);

  // Keep the focused row visible.
  useEffect(() => {
    rowRefs.current[focused]?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="w-[640px] h-[640px] flex flex-col text-white p-6 rounded border border-white/10 bg-white/[0.02]"
          {...panelMotion}
        >
          <header className="mb-5">
            <h2 className="text-2xl tracking-[0.3em] uppercase">Download maps</h2>
            <p className="mt-1 text-[10px] text-white/40 tracking-[0.3em] uppercase">
              Browse and import beatmapsets from the osu! catalogue
            </p>
          </header>

          <input
            type="text"
            autoFocus
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              debouncedSetQuery(e.target.value);
            }}
            placeholder="Search title, artist, mapper…"
            className="w-full bg-black/30 backdrop-blur-sm border border-white/20 text-white text-xs tracking-[0.15em] uppercase placeholder-white/40 px-4 py-2 rounded focus:bg-black/50 focus:border-white/60 outline-none text-center"
          />

          <div className="flex-1 overflow-y-auto mt-4 -mx-1 px-1">
            {searchResults.isLoading && <CenteredHint label="Loading…" />}
            {!searchResults.isLoading && beatmapsets.length === 0 && (
              <CenteredHint label={query.trim() ? "No results" : "Type to search"} />
            )}
            {beatmapsets.map((set, i) => (
              <BeatmapsetRow
                key={set.id}
                ref={(el) => {
                  rowRefs.current[i] = el;
                }}
                beatmapset={set}
                isFocused={focused === i}
                onFocus={() => scene.focused.set(i)}
              />
            ))}
          </div>

          <footer className="mt-4 pt-4 border-t border-white/10 flex items-center justify-center gap-5 text-[10px] text-white/40 tracking-[0.3em] uppercase">
            <span>
              <KeyHint label="↑↓" /> Navigate
            </span>
            <span className="text-white/20">|</span>
            <span>
              <KeyHint label="A" /> Download
            </span>
            <span className="text-white/20">|</span>
            <span>
              <KeyHint label="B" /> Close
            </span>
          </footer>
        </motion.div>
      </div>
    </motion.div>
  );
};

type RowProps = {
  beatmapset: Beatmapset;
  isFocused: boolean;
  onFocus: () => void;
};

const BeatmapsetRow = forwardRef<HTMLButtonElement, RowProps>(function BeatmapsetRow(
  { beatmapset, isFocused, onFocus },
  ref,
) {
  // Install state lives module-level (keyed by set id), so it survives this row
  // unmounting — leaving/reopening the downloader or re-searching shows the true
  // progress instead of resetting to idle.
  const status = useStore(getInstallStatusStore(beatmapset.id));

  const diffs = beatmapset.beatmaps;
  const minDiff = diffs.length > 0 ? Math.min(...diffs.map((d) => d.difficulty_rating)) : 0;
  const maxDiff = diffs.length > 0 ? Math.max(...diffs.map((d) => d.difficulty_rating)) : 0;

  // No-ops while already downloading/done; retries on error (see the store).
  const handleClick = useCallback(() => startBeatmapsetInstall(beatmapset.id), [beatmapset.id]);

  const phaseLabel = installPhaseLabel(status);

  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={handleClick}
      className={`relative w-full text-left flex items-center gap-4 p-3 rounded my-1.5 border transition-colors ${
        isFocused
          ? "bg-white/20 border-white/60 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
          : "bg-white/5 border-white/15 hover:bg-white/10"
      }`}
    >
      <div
        className="w-16 h-16 rounded bg-cover bg-center shrink-0 border border-white/10"
        style={{
          backgroundImage: `url(${beatmapset.covers["list"] ?? beatmapset.covers["card"] ?? beatmapset.covers["cover"] ?? ""})`,
        }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold tracking-[0.18em] uppercase truncate">{beatmapset.title}</div>
        <div className="text-[11px] text-white/60 tracking-[0.1em] truncate mt-1">
          {beatmapset.artist}
          <span className="text-white/30"> · mapped by </span>
          {beatmapset.creator}
        </div>
        {/* While installing, the third line reports the phase; otherwise the
            difficulty spread. Fixed by truncation so the row never reflows. */}
        <div
          className={`text-[10px] tracking-[0.18em] mt-1.5 tabular-nums truncate ${
            phaseLabel ? "text-white/70" : "text-white/50"
          }`}
        >
          {phaseLabel ?? (
            <>
              {minDiff.toFixed(1)} — {maxDiff.toFixed(1)} ★ · {diffs.length} {diffs.length === 1 ? "map" : "maps"}
            </>
          )}
        </div>
      </div>
      <div
        className={`shrink-0 w-9 h-9 flex items-center justify-center rounded-full border bg-white/5 ${
          status.phase === "error" ? "border-red-400/50 text-red-300" : "border-white/30"
        }`}
      >
        <InstallStatusIcon status={status} />
      </div>
      <RowProgressBar status={status} />
    </button>
  );
});

const KeyHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 mr-2 rounded border border-white/30 text-[10px] font-bold tracking-wider text-white/70 align-middle"
    aria-hidden
  >
    {label}
  </span>
);

const CenteredHint = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center h-full text-white/40 text-xs tracking-[0.25em] uppercase">
    {label}
  </div>
);

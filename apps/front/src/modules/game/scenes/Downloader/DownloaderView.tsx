"use client";

import { deleteBeatmapAndOrphanedFiles } from "@/modules/db/cleanup";
import { latestDb } from "@/modules/db/db";
import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";
import { beatmapsetsSearchQueryOptions } from "@/modules/fetching/back/queries/beatmapsets-search";
import { debounce } from "@/modules/utils/debounce";
import type { zOsuControllerBeatmapsetsSearchResponse } from "@tau/back-schemas";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import JSZip from "jszip";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import type { SceneUIComponent } from "../Scene";
import type { DownloaderScene } from "./DownloaderScene";

type Beatmapset = z.infer<typeof zOsuControllerBeatmapsetsSearchResponse>["beatmapsets"][number];

export const DownloaderView: SceneUIComponent<DownloaderScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));

  const focused = useStore(scene.focused);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const debouncedSetQuery = useMemo(
    () => debounce((s: string) => setQuery(s), 300),
    [],
  );
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

  // Keyboard parity for users without a controller.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        scene.moveFocus(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        scene.moveFocus(+1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        scene.confirmFocused();
      } else if (e.key === "Escape") {
        e.preventDefault();
        scene.close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scene]);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
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
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const diffs = beatmapset.beatmaps;
  const minDiff = diffs.length > 0 ? Math.min(...diffs.map((d) => d.difficulty_rating)) : 0;
  const maxDiff = diffs.length > 0 ? Math.max(...diffs.map((d) => d.difficulty_rating)) : 0;

  const handleClick = useCallback(async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      await downloadBeatmapset(beatmapset);
      setState("done");
    } catch (e) {
      console.error("Failed to download beatmapset", e);
      setState("idle");
    }
  }, [beatmapset, state]);

  return (
    <button
      ref={ref}
      type="button"
      onMouseEnter={onFocus}
      onFocus={onFocus}
      onClick={handleClick}
      className={`w-full text-left flex items-center gap-4 p-3 rounded my-1.5 border transition-colors ${
        isFocused
          ? "bg-white/20 border-white/60 shadow-[0_0_18px_rgba(255,255,255,0.12)]"
          : "bg-white/5 border-white/15 hover:bg-white/10"
      }`}
    >
      <div
        className="w-16 h-16 rounded bg-cover bg-center shrink-0 border border-white/10"
        style={{ backgroundImage: `url(${beatmapset.covers["list"] ?? beatmapset.covers["card"] ?? beatmapset.covers["cover"] ?? ""})` }}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold tracking-[0.18em] uppercase truncate">
          {beatmapset.title}
        </div>
        <div className="text-[11px] text-white/60 tracking-[0.1em] truncate mt-1">
          {beatmapset.artist}
          <span className="text-white/30"> · mapped by </span>
          {beatmapset.creator}
        </div>
        <div className="text-[10px] text-white/50 tracking-[0.18em] mt-1.5 tabular-nums">
          {minDiff.toFixed(1)} — {maxDiff.toFixed(1)} ★ ·{" "}
          {diffs.length} {diffs.length === 1 ? "map" : "maps"}
        </div>
      </div>
      <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border border-white/30 bg-white/5">
        {state === "loading" && (
          <div className="w-4 h-4 border-t-white border-b-transparent border rounded-full animate-spin" />
        )}
        {state === "done" && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M3 8l3.5 3.5L13 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {state === "idle" && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M8 2v9m0 0l-4-4m4 4l4-4M2 14h12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
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

async function downloadBeatmapset(beatmapset: Beatmapset): Promise<void> {
  const zip = new JSZip();
  const response = await fetch(
    `https://api.nerinyan.moe/d/${beatmapset.id}?NoHitSound=1&NoVideo=1`,
  );
  const unzipped = await zip.loadAsync(await response.arrayBuffer());
  const allFiles = Object.values(unzipped.files);
  const beatmapFileList = allFiles.filter((file) => file.name.endsWith(".osu"));

  const listBackgroundFileResponse = await fetch(beatmapset.covers["list"], {
    mode: "no-cors",
  });
  const listBackgroundFileContent = await listBackgroundFileResponse.arrayBuffer();
  const listBackgroundFileId = await latestDb.files.add({
    content: new Blob([listBackgroundFileContent]),
    createdAt: new Date(),
    extension: "jpg",
  });

  const alreadyAddedFiles = new Map<string, number>();

  for (const file of beatmapFileList) {
    try {
      const content = await file.async("string");
      const parsedMap = convertFromOsu(content, (path) => path);

      // Re-download = overwrite: drop the existing row + any of its files
      // that no other beatmap references, then fall through to the normal
      // import path. The schema only indexes idv2 (no uniqueness constraint)
      // so without this step a second import would silently duplicate.
      const existing = await latestDb.beatmaps.where("idv2").equals(parsedMap.id).first();
      if (existing) {
        console.log(`Overwriting existing beatmap ${parsedMap.id}`);
        await deleteBeatmapAndOrphanedFiles(existing);
      }

      const backgroundFile = allFiles.find((f) => f.name === parsedMap.backgroundUrl);
      const audioFile = allFiles.find((f) => f.name === parsedMap.audioUrl);

      // Skip beatmaps whose .osu references files that aren't in the zip —
      // they're unplayable and would otherwise be persisted with null
      // audioId/gameplayBackgroundId, breaking the preview/playback path.
      if (!backgroundFile || !audioFile) {
        console.warn(
          `Skipping beatmap ${parsedMap.id}: missing ${!audioFile ? "audio" : ""}${
            !audioFile && !backgroundFile ? " + " : ""
          }${!backgroundFile ? "background" : ""} file in zip`,
        );
        continue;
      }

      let backgroundFileId = alreadyAddedFiles.get(backgroundFile.name) ?? null;
      let audioFileId = alreadyAddedFiles.get(audioFile.name) ?? null;

      if (backgroundFileId === null) {
        const fileContent = await backgroundFile.async("arraybuffer");
        backgroundFileId = await latestDb.files.add({
          content: new Blob([fileContent]),
          createdAt: new Date(),
          extension: backgroundFile.name.split(".").pop() || "",
        });
        alreadyAddedFiles.set(backgroundFile.name, backgroundFileId);
      }

      if (audioFileId === null) {
        const fileContent = await audioFile.async("arraybuffer");
        audioFileId = await latestDb.files.add({
          content: new Blob([fileContent]),
          createdAt: new Date(),
          extension: audioFile.name.split(".").pop() || "",
        });
        alreadyAddedFiles.set(audioFile.name, audioFileId);
      }

      await latestDb.beatmaps.add({
        idv2: parsedMap.id,
        title: parsedMap.title,
        artist: parsedMap.artist,
        creator: parsedMap.creator,
        difficulty: parsedMap.difficulty,
        content: new Blob([content]),
        gameplayBackgroundId: backgroundFileId,
        audioId: audioFileId,
        listBackgroundId: listBackgroundFileId,
        createdAt: new Date(),
      });
    } catch (e) {
      console.error("Failed to import a beatmap from the beatmapset:", e);
    }
  }
}

"use client";

import { Modal } from "@/components/Modal";
import { latestDb } from "@/modules/db/db";
import { useAction, useActionRepeat } from "@/modules/game/hooks/useActions";
import { convertFromOsu } from "@/modules/osu/convert/OsuConverter";
import { beatmapsetsSearchQueryOptions } from "@/modules/fetching/back/queries/beatmapsets-search";
import { debounce } from "@/modules/utils/debounce";
import type { zOsuControllerBeatmapsetsSearchResponse } from "@tau/back-schemas";
import { useQuery } from "@tanstack/react-query";
import JSZip from "jszip";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { z } from "zod";

type Beatmapset = z.infer<typeof zOsuControllerBeatmapsetsSearchResponse>["beatmapsets"][number];

type BeatmapsetDownloaderProps = {
  isVisible: boolean;
  onClose: () => void;
};

export const BeatmapsetDownloader = ({ isVisible, onClose }: BeatmapsetDownloaderProps) => {
  // Modal returns null when not visible, so DownloaderContent + its hooks only
  // mount (and subscribe to gamepad/keyboard input) while the modal is open.
  return (
    <Modal isVisible={isVisible} onClose={onClose} rounded={false}>
      <DownloaderContent onClose={onClose} />
    </Modal>
  );
};

const DownloaderContent = ({ onClose }: { onClose: () => void }) => {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const debouncedSetQuery = useMemo(
    () => debounce((s: string) => setQuery(s), 300),
    [],
  );
  const searchResults = useQuery(beatmapsetsSearchQueryOptions(query));
  const beatmapsets = searchResults.data?.beatmapsets ?? [];

  const [focused, setFocused] = useState(0);
  // Reset focus to top whenever the result set changes. Adjusted during
  // render via the prev-state pattern instead of an effect so we don't
  // commit an extra empty render before fixing focus.
  const [prevData, setPrevData] = useState(searchResults.data);
  if (prevData !== searchResults.data) {
    setPrevData(searchResults.data);
    setFocused(0);
  }

  // Refs read inside input handlers so we don't churn subscriptions on every
  // focus or list change. Sync'd via effects so we don't write to refs during
  // render.
  const focusedRef = useRef(focused);
  useEffect(() => {
    focusedRef.current = focused;
  });
  const beatmapsetsLengthRef = useRef(beatmapsets.length);
  useEffect(() => {
    beatmapsetsLengthRef.current = beatmapsets.length;
  });
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const moveFocus = useCallback((delta: -1 | 1) => {
    setFocused((f) => {
      const count = beatmapsetsLengthRef.current;
      if (count === 0) return 0;
      return Math.max(0, Math.min(count - 1, f + delta));
    });
  }, []);

  const confirmFocused = useCallback(() => {
    rowRefs.current[focusedRef.current]?.click();
  }, []);

  const onNavUp = useCallback(() => moveFocus(-1), [moveFocus]);
  const onNavDown = useCallback(() => moveFocus(+1), [moveFocus]);

  useActionRepeat("nav-up", onNavUp);
  useActionRepeat("nav-down", onNavDown);
  useAction("confirm", confirmFocused);

  // Keep the focused row visible.
  useEffect(() => {
    rowRefs.current[focused]?.scrollIntoView({ block: "nearest" });
  }, [focused]);

  // Keyboard parity for users without a controller.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveFocus(-1);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveFocus(+1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        confirmFocused();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveFocus, confirmFocused, onClose]);

  return (
    <div
      className="w-[640px] h-[640px] flex flex-col text-white"
      style={{ fontFamily: "Rostex" }}
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
            onFocus={() => setFocused(i)}
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
    </div>
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

  const handleClick = async () => {
    if (state !== "idle") return;
    setState("loading");
    try {
      await downloadBeatmapset(beatmapset);
      setState("done");
    } catch (e) {
      console.error("Failed to download beatmapset", e);
      setState("idle");
    }
  };

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

      const backgroundFile = allFiles.find((f) => f.name === parsedMap.backgroundUrl);
      const audioFile = allFiles.find((f) => f.name === parsedMap.audioUrl);

      let backgroundFileId: number | null =
        (backgroundFile && alreadyAddedFiles.get(backgroundFile.name)) || null;
      let audioFileId: number | null =
        (audioFile && alreadyAddedFiles.get(audioFile.name)) || null;

      if (backgroundFile && !backgroundFileId) {
        const fileContent = await backgroundFile.async("arraybuffer");
        backgroundFileId = await latestDb.files.add({
          content: new Blob([fileContent]),
          createdAt: new Date(),
          extension: backgroundFile.name.split(".").pop() || "",
        });
        alreadyAddedFiles.set(backgroundFile.name, backgroundFileId);
      }

      if (audioFile && !audioFileId) {
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
        gameplayBackgroundId: backgroundFileId!,
        audioId: audioFileId!,
        listBackgroundId: listBackgroundFileId,
        createdAt: new Date(),
      });
    } catch (e) {
      console.error("Failed to import a beatmap from the beatmapset:", e);
    }
  }
}

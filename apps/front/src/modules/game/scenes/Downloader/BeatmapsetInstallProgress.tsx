"use client";

import { motion } from "motion/react";
import type { InstallStatus } from "./beatmapInstallStore";

const EASE: readonly [number, number, number, number] = [0.4, 0, 0.2, 1];

/**
 * Fraction of the bar given to the download phase; the install phase fills the
 * remainder. Weighting the two into one continuous 0–100 track (rather than a
 * per-phase bar that resets at the hand-off) keeps the fill moving only ever
 * forward, which reads as a single smooth install.
 */
const DOWNLOAD_WEIGHT = 60;

/** Whether an install is actively running (download or unpack in progress). */
export function isInstallActive(status: InstallStatus): boolean {
  return status.phase === "downloading" || status.phase === "installing";
}

/** A download with no Content-Length — byte total unknown, so show a pulse. */
function isIndeterminate(status: InstallStatus): boolean {
  return status.phase === "downloading" && status.totalBytes == null;
}

/** Weighted 0–100 fill across both phases. */
function installPercent(status: InstallStatus): number {
  switch (status.phase) {
    case "downloading":
      return status.totalBytes
        ? Math.round((status.receivedBytes / status.totalBytes) * DOWNLOAD_WEIGHT)
        : 0;
    case "installing":
      return status.total
        ? DOWNLOAD_WEIGHT + Math.round((status.completed / status.total) * (100 - DOWNLOAD_WEIGHT))
        : DOWNLOAD_WEIGHT;
    case "done":
      return 100;
    default:
      return 0;
  }
}

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Human-readable phase line for the row's third text slot. Returns null when
 * there's nothing to say (idle / done), so the row falls back to its metadata.
 */
export function installPhaseLabel(status: InstallStatus): string | null {
  switch (status.phase) {
    case "downloading":
      return status.totalBytes
        ? `Downloading · ${formatBytes(status.receivedBytes)} / ${formatBytes(status.totalBytes)}`
        : `Downloading · ${formatBytes(status.receivedBytes)}`;
    case "installing":
      return `Installing · ${status.completed} / ${status.total}`;
    case "error":
      return "Download failed · press to retry";
    default:
      return null;
  }
}

/**
 * Contents of the row's status disc: a download glyph when idle, a live percent
 * (or spinner for an unsized download) while running, a tick when done, and a
 * retry glyph on failure.
 */
export function InstallStatusIcon({ status }: { status: InstallStatus }) {
  if (isInstallActive(status)) {
    if (isIndeterminate(status)) {
      return <div className="w-4 h-4 border-t-white border-b-transparent border rounded-full animate-spin" />;
    }
    return <span className="text-[9px] font-semibold tabular-nums tracking-tight">{installPercent(status)}%</span>;
  }

  if (status.phase === "done") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status.phase === "error") {
    return (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path
          d="M13 8a5 5 0 11-1.46-3.54M13 2v3h-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2v9m0 0l-4-4m4 4l4-4M2 14h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Thin progress track pinned to the bottom edge of a row, shown only while an
 * install runs. Determinate fill animates to the weighted percent; a travelling
 * shimmer keeps it alive (and conveys progress on its own when the download is
 * unsized). Mirrors the FirstRunImportOverlay bar for a consistent look.
 */
export function RowProgressBar({ status }: { status: InstallStatus }) {
  if (!isInstallActive(status)) return null;

  return (
    <div className="absolute bottom-1.5 left-3 right-3 h-[3px] rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className="absolute inset-y-0 left-0 rounded-full bg-white"
        style={{ boxShadow: "0 0 10px rgba(255,255,255,0.55)" }}
        initial={false}
        animate={{ width: `${installPercent(status)}%` }}
        transition={{ duration: 0.4, ease: EASE }}
      />
      <motion.div
        className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{ x: ["-120%", "520%"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

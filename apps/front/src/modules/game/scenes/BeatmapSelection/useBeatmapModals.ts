"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";

export type BeatmapModals = {
  isFilterPanelOpen: boolean;
  setFilterPanelOpen: Dispatch<SetStateAction<boolean>>;
  isDownloaderOpen: boolean;
  setDownloaderOpen: Dispatch<SetStateAction<boolean>>;
  /** True while either modal is open — the scene blocks gamepad input on this flag. */
  isAnyOpen: boolean;
  /**
   * Closes whichever modal is currently visible. Filter panel takes priority
   * if (somehow) both were open. Wired as the scene's back-handler so a
   * controller's B button dismisses the modal instead of popping the scene.
   */
  closeTop: () => void;
};

export function useBeatmapModals(): BeatmapModals {
  const [isFilterPanelOpen, setFilterPanelOpen] = useState(false);
  const [isDownloaderOpen, setDownloaderOpen] = useState(false);
  const isAnyOpen = isFilterPanelOpen || isDownloaderOpen;

  const closeTop = useCallback(() => {
    if (isFilterPanelOpen) setFilterPanelOpen(false);
    else if (isDownloaderOpen) setDownloaderOpen(false);
  }, [isFilterPanelOpen, isDownloaderOpen]);

  return {
    isFilterPanelOpen,
    setFilterPanelOpen,
    isDownloaderOpen,
    setDownloaderOpen,
    isAnyOpen,
    closeTop,
  };
}

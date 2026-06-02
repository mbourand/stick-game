import { useEngine } from "../useEngine";
import type { ViewportMetrics } from "../Viewport";
import { useStore } from "./useStore";

/**
 * Live viewport metrics (size, dpr, design→screen scale). Must be used within
 * the EngineContext provided by GameShell. Scene views multiply their
 * centre-anchored content by `scale` so the DOM overlay stays pixel-locked to
 * the canvas, which scales by the same factor.
 */
export function useViewport(): ViewportMetrics {
  return useStore(useEngine().viewport);
}

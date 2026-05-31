import { useContext } from "react";
import { EngineContext } from "../EngineContext";
import type { ViewportMetrics } from "../Viewport";
import { useStore } from "./useStore";

/**
 * Live viewport metrics (size, dpr, design→screen scale). Must be used within
 * the EngineContext provided by GameShell. Scene views multiply their
 * centre-anchored content by `scale` so the DOM overlay stays pixel-locked to
 * the canvas, which scales by the same factor.
 */
export function useViewport(): ViewportMetrics {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error("useViewport must be used within an EngineContext provider");
  return useStore(engine.viewport);
}

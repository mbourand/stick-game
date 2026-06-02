import { useContext } from "react";
import type { Engine } from "./Engine";
import { EngineContext } from "./EngineContext";

/**
 * The live Engine. GameShell provides it non-null from the first render, so
 * this throws only when used outside the provider — a programming error, not a
 * transient null every caller has to branch on.
 */
export function useEngine(): Engine {
  const engine = useContext(EngineContext);
  if (!engine) throw new Error("useEngine must be used within an EngineContext provider");
  return engine;
}

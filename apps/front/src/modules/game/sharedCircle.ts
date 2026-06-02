import type { Engine } from "./engine/Engine";
import { CircleLayer } from "./entities/CircleLayer";

/**
 * The game's persistent ring lives in the Engine's generic persistent-entity
 * registry rather than as a hard field on the Engine — the Engine stays game
 * agnostic and the ring still survives scene swaps (the registry outlives
 * scenes). These two helpers are the only place the "circle" key and its type
 * are spelled out.
 */
const SHARED_CIRCLE_KEY = "circle";

/** Register the shared ring at boot (idempotent). Call once before pushing the first scene. */
export function ensureSharedCircle(engine: Engine): CircleLayer {
  const existing = engine.persistentEntities.get(SHARED_CIRCLE_KEY);
  if (existing instanceof CircleLayer) return existing;
  const circle = new CircleLayer();
  engine.persistentEntities.set(SHARED_CIRCLE_KEY, circle);
  return circle;
}

/** Get the shared ring. Throws if `ensureSharedCircle` wasn't called at boot. */
export function sharedCircle(engine: Engine): CircleLayer {
  const circle = engine.persistentEntities.get(SHARED_CIRCLE_KEY);
  if (!(circle instanceof CircleLayer)) {
    throw new Error("Shared circle not registered — call ensureSharedCircle(engine) at boot.");
  }
  return circle;
}

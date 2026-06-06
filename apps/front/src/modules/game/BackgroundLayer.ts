import type { Engine } from "./engine/Engine";
import { BackgroundCrossfader } from "./entities/BackgroundCrossfader";
import { sharedCircle } from "./sharedCircle";

/**
 * The single, app-wide circular background lives in the Engine's persistent
 * entity registry (like the ring and the now-playing player), so it survives
 * scene swaps. Every canvas scene adds this one instance to its `root` behind
 * the ring and, on entry, points it at the image it wants; the crossfader fades
 * only on a genuine content change, never because a scene transition ran. These
 * two helpers are the only place the key and its type are spelled out.
 */
const BACKGROUND_LAYER_KEY = "backgroundLayer";

/** How long the background crossfades when its image / treatment changes. */
const BACKGROUND_CROSSFADE_MS = 300;

/**
 * Floor for the baked texture radius — comfortably above the largest menu-world
 * ring (selection, 460). Every menu/selection/scores/default-gameplay source
 * bakes at this size and just clips down, so they share one image scale: a ring
 * resize between them reveals more/less of the image without rescaling it. Only
 * an extreme gameplay circle scale bakes larger.
 */
const BASE_RADIUS = 480;

/** Register the shared background layer at boot (idempotent). */
export function ensureBackgroundLayer(engine: Engine): BackgroundCrossfader {
  const existing = engine.persistentEntities.get(BACKGROUND_LAYER_KEY);
  if (existing instanceof BackgroundCrossfader) return existing;
  const layer = new BackgroundCrossfader(engine.settings, {
    fadeDurationMs: BACKGROUND_CROSSFADE_MS,
    baseRadius: BASE_RADIUS,
    // Built once per source at its baked radius; clip to the live ring so the
    // crop follows a resizing ring across transitions.
    clipRadius: () => sharedCircle(engine).radius,
  });
  engine.persistentEntities.set(BACKGROUND_LAYER_KEY, layer);
  // The layer lives in multiple scene roots at once (both sides of a transition,
  // overlays); it must draw only once per frame. Re-arm that guard at the end of
  // every frame, independent of which scenes were updated.
  engine.registerFrameCallback(() => layer.resetRenderGuard());
  return layer;
}

/** Get the shared background layer. Throws if `ensureBackgroundLayer` wasn't called at boot. */
export function backgroundLayer(engine: Engine): BackgroundCrossfader {
  const layer = engine.persistentEntities.get(BACKGROUND_LAYER_KEY);
  if (!(layer instanceof BackgroundCrossfader)) {
    throw new Error("Background layer not registered — call ensureBackgroundLayer(engine) at boot.");
  }
  return layer;
}

import type { Engine } from "./engine/Engine";
import { NowPlayingController } from "./NowPlayingController";

/**
 * The shared "now playing" player lives in the Engine's persistent-entity
 * registry (like the ring), so the audio + background + visualizer survive scene
 * swaps and the menu jukebox and selection preview are one continuous player.
 * These two helpers are the only place the key and its type are spelled out.
 */
const NOW_PLAYING_KEY = "nowPlaying";

/** Register the shared now-playing player at boot (idempotent). */
export function ensureNowPlaying(engine: Engine): NowPlayingController {
  const existing = engine.persistentEntities.get(NOW_PLAYING_KEY);
  if (existing instanceof NowPlayingController) return existing;
  const controller = new NowPlayingController(engine);
  engine.persistentEntities.set(NOW_PLAYING_KEY, controller);
  return controller;
}

/** Get the shared now-playing player. Throws if `ensureNowPlaying` wasn't called at boot. */
export function nowPlaying(engine: Engine): NowPlayingController {
  const controller = engine.persistentEntities.get(NOW_PLAYING_KEY);
  if (!(controller instanceof NowPlayingController)) {
    throw new Error("Now-playing player not registered — call ensureNowPlaying(engine) at boot.");
  }
  return controller;
}

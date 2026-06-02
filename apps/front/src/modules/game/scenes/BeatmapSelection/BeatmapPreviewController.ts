import { latestDb } from "@/modules/db/db";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { BackgroundCrossfader } from "../../entities/BackgroundCrossfader";
import { Container } from "../../engine/Container";
import type { Engine } from "../../engine/Engine";
import { CircleAudioVisualizer } from "../../flair/CircleAudioVisualizer";
import { LruCache } from "../../utils/LruCache";
import { CIRCLE_RADIUS_PX } from "./layout";

/** A beatmap's resolved blob URLs for the preview audio + circle background. */
export type MediaUrls = { audioUrl: string; backgroundUrl: string };

const MEDIA_URL_CACHE_SIZE = 10;
const PREVIEW_AUDIO_ID = "beatmap_preview_audio";
const PREVIEW_AUDIO_VOLUME = 0.7;
const BACKGROUND_CROSSFADE_MS = 300;

function revokeMediaUrls({ audioUrl, backgroundUrl }: MediaUrls) {
  URL.revokeObjectURL(audioUrl);
  URL.revokeObjectURL(backgroundUrl);
}

function sameMedia(a: MediaUrls | null, b: MediaUrls | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.audioUrl === b.audioUrl && a.backgroundUrl === b.backgroundUrl;
}

/**
 * Owns the beatmap-selection audio preview + circle background: the looping
 * preview source, the background crossfader, the audio visualizer, and the
 * blob-URL cache. The scene owns navigation/state and delegates the preview
 * concern here.
 *
 * `container` is added to the scene's render tree and faded by transitions.
 * The URL cache lives here (not in a view ref) so a media reference survives
 * view remounts on overlay close — `setFocusedMedia` then short-circuits via
 * `sameMedia`, leaving the still-playing preview audio + background untouched.
 */
export class BeatmapPreviewController {
  /** Holds the background crossfader + audio visualizer; faded to 0 during exit transitions. */
  readonly container = new Container();

  private readonly background: BackgroundCrossfader;
  private readonly audioVisualizer: CircleAudioVisualizer;

  private currentMedia: MediaUrls | null = null;
  private generation = 0;
  /** Whether the preview source is currently playing — lets re-arm skip a still-playing preview. */
  private armed = false;

  private readonly urlCache = new LruCache<string, MediaUrls>(MEDIA_URL_CACHE_SIZE, revokeMediaUrls);

  constructor(
    private readonly engine: Engine,
    /** Scene-active check — preview side effects bail when the scene isn't active. */
    private readonly isActive: () => boolean,
  ) {
    this.background = new BackgroundCrossfader(engine.settings, {
      radius: CIRCLE_RADIUS_PX,
      fadeDurationMs: BACKGROUND_CROSSFADE_MS,
    });
    this.audioVisualizer = new CircleAudioVisualizer(
      engine.audio.music.getAudioContext(),
      40,
      CIRCLE_RADIUS_PX,
      30,
      engine.settings,
    );
    // Renders behind the circle, like gameplay: background → visualizer.
    this.container.add(this.background);
    this.container.add(this.audioVisualizer);
  }

  /** Whether a media source has been selected (regardless of armed/playing state). */
  get hasMedia(): boolean {
    return this.currentMedia !== null;
  }

  /**
   * Tell the controller which beatmap is currently hovered. Triggers an audio
   * preview + circle background. Pass null to clear both.
   */
  setFocusedMedia(media: MediaUrls | null): void {
    if (sameMedia(this.currentMedia, media)) return;
    this.currentMedia = media;
    void this.refresh(++this.generation);
  }

  /**
   * Re-arm the preview only if media is selected but not currently playing.
   * Coming back from gameplay/scores (audio was stopped) restarts it; coming
   * back from an overlay (audio still playing) is a no-op.
   */
  reArmIfNeeded(): void {
    if (this.currentMedia && !this.armed) void this.refresh(++this.generation);
  }

  /**
   * Cached blob-URL lookup for a beatmap's audio + background. Returns null if
   * the beatmap is missing its referenced files in the DB.
   */
  async resolveMediaUrls(beatmap: V3BeatmapEntity): Promise<MediaUrls | null> {
    const cached = this.urlCache.get(beatmap.idv2);
    if (cached) return cached;
    // Legacy beatmaps in the DB may have null ids if the downloader couldn't
    // find the referenced audio/background file in the zip. Skip cleanly
    // instead of letting Dexie throw on Table.get(invalid).
    if (beatmap.audioId == null || beatmap.gameplayBackgroundId == null) return null;
    const [audioFile, bgFile] = await Promise.all([
      latestDb.files.get(beatmap.audioId),
      latestDb.files.get(beatmap.gameplayBackgroundId),
    ]);
    if (!audioFile || !bgFile) return null;
    const urls: MediaUrls = {
      audioUrl: URL.createObjectURL(audioFile.content),
      backgroundUrl: URL.createObjectURL(bgFile.content),
    };
    this.urlCache.set(beatmap.idv2, urls);
    return urls;
  }

  /** Stop the preview source. Leaves `currentMedia` intact so re-arm can restart it. */
  stop(): void {
    this.engine.audio.music.stop(PREVIEW_AUDIO_ID);
    this.armed = false;
  }

  private async refresh(generation: number): Promise<void> {
    this.stop();

    const media = this.currentMedia;
    if (!media || !this.isActive()) {
      this.background.setSource(null);
      return;
    }

    this.background.setSource(media.backgroundUrl);

    const music = this.engine.audio.music;
    let buffer: AudioBuffer;
    try {
      buffer = await music.loadBuffer(media.audioUrl);
    } catch (e) {
      console.error("Failed to load preview audio", e);
      return;
    }
    if (generation !== this.generation || !this.isActive()) return;
    const source = music.play(PREVIEW_AUDIO_ID, buffer, { loop: true, volume: PREVIEW_AUDIO_VOLUME });
    this.audioVisualizer.connectSource(source);
    this.armed = true;
  }
}

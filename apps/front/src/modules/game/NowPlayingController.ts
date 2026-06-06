import { latestDb } from "@/modules/db/db";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import { backgroundLayer } from "./BackgroundLayer";
import { Container } from "./engine/Container";
import type { Engine } from "./engine/Engine";
import type { TickContext } from "./engine/TickContext";
import { Store } from "./engine/state/Store";
import { CircleAudioVisualizer } from "./flair/CircleAudioVisualizer";
import { sharedCircle } from "./sharedCircle";
import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "./utils/constants";
import { LruCache } from "./utils/LruCache";

/** A beatmap's resolved blob URLs for the now-playing audio + circle background. */
export type MediaUrls = { audioUrl: string; backgroundUrl: string };

/** What the menu shows in its now-playing label. */
export type NowPlayingTrack = { title: string; artist: string };

const MEDIA_URL_CACHE_SIZE = 10;
/** Single music channel shared by the preview (selection) and the jukebox (menu). */
const NOW_PLAYING_AUDIO_ID = "beatmap_preview_audio";
const NOW_PLAYING_VOLUME = 0.7;
const VISUALIZER_BAR_COUNT = 40;
const VISUALIZER_MAX_AMPLITUDE = 30;
/**
 * Bake the menu-side background at the larger (selection) ring, then clip it to
 * the live ring each frame — so one shared texture fits both the 310px menu ring
 * and the 460px selection ring (and animates between them).
 */
const BUILD_RADIUS = BEATMAP_SELECTION_CIRCLE_RADIUS;

type Mode = "preview" | "jukebox";

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
 * The single, persistent "now playing" player shared across the menu and beatmap
 * selection: one looping/play-through audio channel, one audio visualizer, and
 * the blob-URL cache. It drives the shared, persistent background layer (it does
 * not own it). Because it's one instance (borrowed into whichever scene is
 * active, like the shared ring), the song + visualizer continue seamlessly when
 * navigating between those screens.
 *
 * Two modes:
 *  - **preview** (selection): the scene pushes the focused map via `setFocusedMedia`,
 *    played looping.
 *  - **jukebox** (menu): auto-plays a shuffled queue of the whole library,
 *    play-through, advancing on track end.
 *
 * It extends Container (bg + visualizer children) so it is the persistent Entity
 * scenes add to their `root`. Audio lives on the engine's AudioBus, so it keeps
 * playing across scene swaps regardless of which tree the container is in.
 */
export class NowPlayingController extends Container {
  private readonly visualizer: CircleAudioVisualizer;

  private currentMedia: MediaUrls | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  /** Bumped on every track switch; stale async refreshes / onended handlers bail. */
  private generation = 0;
  /** Whether the channel is currently playing (lets re-arm skip a live source). */
  private armed = false;
  /** Whether playback is allowed on the current screen (false under gameplay/scores). */
  private live = false;
  private mode: Mode = "preview";
  /** Dedupe the double-tick during scene transitions (the container is in two roots). */
  private lastUpdatedFrame = -1;

  // Jukebox state.
  private library: V3BeatmapEntity[] | null = null;
  private queue: V3BeatmapEntity[] = [];
  /** Tracks already played this session (most recent last) — drives "previous". */
  private history: V3BeatmapEntity[] = [];
  /** The entity currently playing in jukebox mode (null for an inherited preview). */
  private currentEntity: V3BeatmapEntity | null = null;
  private lastPlayedId: string | null = null;

  /**
   * idv2 of whatever is currently playing — set by both the jukebox (playEntity)
   * and the selection preview (setFocusedMedia), so it survives a track being
   * *inherited* across screens (where `currentEntity` is null). Lets beatmap
   * selection land its focus on the playing map, carrying the song + background
   * straight over instead of jumping to a random pick.
   */
  private currentBeatmapId: string | null = null;

  /** idv2 of the track currently playing, or null when nothing is. */
  public get playingBeatmapId(): string | null {
    return this.currentBeatmapId;
  }

  /** The current jukebox track for the menu label, or null when nothing's playing. */
  readonly currentTrack = new Store<NowPlayingTrack | null>(null);
  /** Whether jukebox playback is paused, for the menu's play/pause control. */
  readonly pausedStore = new Store<boolean>(false);

  // Pause/resume bookkeeping — Web Audio has no per-source pause, so we stop the
  // source and replay the cached buffer from the elapsed offset on resume.
  private paused = false;
  private pausedOffsetSec = 0;
  private currentBuffer: AudioBuffer | null = null;
  private currentLoop = false;
  private playStartedAtSec = 0;
  private playStartOffsetSec = 0;

  private readonly urlCache = new LruCache<string, MediaUrls>(MEDIA_URL_CACHE_SIZE, revokeMediaUrls);

  // Deferred-start (autoplay) unlock — the AudioContext boots suspended.
  private unlockHandler: (() => void) | null = null;
  private pendingStart: (() => void) | null = null;

  constructor(private readonly engine: Engine) {
    super();
    this.visualizer = new CircleAudioVisualizer(
      engine.audio.music.getAudioContext(),
      VISUALIZER_BAR_COUNT,
      BUILD_RADIUS,
      VISUALIZER_MAX_AMPLITUDE,
      engine.settings,
    );
    // The background is the shared persistent layer (added separately, behind
    // this controller in the scene); this container holds only the visualizer.
    this.add(this.visualizer);
  }

  /** Point the shared background layer at this player's menu-treatment artwork. */
  private showBackground(backgroundUrl: string): void {
    backgroundLayer(this.engine).setSource(backgroundUrl, { variant: "menu", radius: BUILD_RADIUS });
  }

  public override update(tick: TickContext): void {
    // During a push/pop transition the container sits in two scene roots and is
    // ticked twice per frame; advance state only once.
    if (tick.frame === this.lastUpdatedFrame) return;
    this.lastUpdatedFrame = tick.frame;
    this.visualizer.setRadius(sharedCircle(this.engine).radius);
    super.update(tick);
  }

  // ---- shared lifecycle ------------------------------------------------------

  public setLive(live: boolean): void {
    this.live = live;
  }

  /** Stop the channel. Leaves `currentMedia` so re-arm can restart from the same track. */
  public stop(): void {
    this.engine.audio.music.stop(NOW_PLAYING_AUDIO_ID);
    this.currentSource = null;
    this.currentBuffer = null;
    this.armed = false;
    this.setPaused(false);
  }

  private setPaused(paused: boolean): void {
    this.paused = paused;
    this.pausedStore.set(paused);
  }

  /** Stop and forbid playback — used before gameplay (which owns its own channel). */
  public suspend(): void {
    this.stop();
    this.live = false;
  }

  /** Re-arm if a track is selected but not currently playing (back from gameplay/scores). */
  public reArmIfNeeded(): void {
    if (this.currentMedia && !this.armed) {
      void this.refresh(++this.generation, this.mode === "jukebox");
    }
  }

  // ---- preview mode (beatmap selection) -------------------------------------

  public enterPreviewMode(): void {
    this.mode = "preview";
    // The jukebox history/queue belong to a menu session; entering selection
    // ends it, so a later "previous" doesn't reach across the visit.
    this.history = [];
    this.currentEntity = null;
    // A track inherited from the jukebox plays through (non-loop). In selection
    // the focused map should loop — flip the live source to looping in place so
    // it keeps playing seamlessly instead of running out into silence.
    if (this.currentSource) {
      this.currentSource.loop = true;
      this.currentLoop = true;
    }
  }

  /**
   * Selection pushes the focused map here; played looping. Null clears playback.
   * `track` + `beatmapId` are remembered so that if the player heads back to the
   * menu, the jukebox inherits this song *with* its label, and a later return to
   * selection can re-focus the same map.
   */
  public setFocusedMedia(
    media: MediaUrls | null,
    track: NowPlayingTrack | null = null,
    beatmapId: string | null = null,
  ): void {
    this.currentTrack.set(media ? track : null);
    this.currentBeatmapId = media ? beatmapId : null;
    if (sameMedia(this.currentMedia, media)) return;
    this.currentMedia = media;
    void this.refresh(++this.generation, true);
  }

  /** Cached blob-URL lookup for a beatmap's audio + background (null if files missing). */
  public async resolveMediaUrls(beatmap: V3BeatmapEntity): Promise<MediaUrls | null> {
    const cached = this.urlCache.get(beatmap.idv2);
    if (cached) return cached;
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

  // ---- jukebox mode (main menu) ---------------------------------------------

  /**
   * Enter jukebox mode. If nothing is playing, start the shuffled rotation;
   * otherwise adopt the song inherited from selection — let it play through (no
   * loop) and advance when it ends — and re-sync the background (a track may have
   * advanced while the menu was hidden under an overlay).
   */
  public async enterJukeboxMode(): Promise<void> {
    this.mode = "jukebox";
    await this.ensureLibrary();
    if (!this.library || this.library.length === 0) {
      this.currentTrack.set(null);
      return;
    }

    if (!this.currentMedia) {
      void this.advance();
      return;
    }

    if (this.currentSource) {
      // Inherited a looping selection preview — finish it, then advance.
      this.currentSource.loop = false;
      this.currentLoop = false;
      this.installEndedAdvance(this.currentSource, this.generation);
      this.showBackground(this.currentMedia.backgroundUrl);
    } else {
      // Media set but not armed (e.g. returned from gameplay) — start it fresh.
      void this.refresh(++this.generation, false);
    }
  }

  /** Jump to the next shuffled track immediately. */
  public skip(): void {
    if (this.mode !== "jukebox") return;
    void this.advance();
  }

  /**
   * Go back to the previously played track. With no history, restart the current
   * track from the beginning (the familiar music-player behaviour).
   */
  public previous(): void {
    if (this.mode !== "jukebox") return;
    const prev = this.history.pop();
    if (!prev) {
      if (this.currentEntity) void this.playEntity(this.currentEntity);
      return;
    }
    // Send the current track back to the front of the queue so "next" replays it.
    if (this.currentEntity) this.queue.unshift(this.currentEntity);
    void this.playEntity(prev);
  }

  /** Pause or resume jukebox playback (a no-op outside jukebox mode). */
  public togglePause(): void {
    if (this.mode !== "jukebox") return;
    if (this.paused) this.unpause();
    else this.pause();
  }

  private async advance(): Promise<void> {
    await this.ensureLibrary();
    const next = this.queue.shift();
    if (!next) {
      this.currentTrack.set(null);
      return;
    }
    if (this.currentEntity) this.history.push(this.currentEntity);
    await this.playEntity(next);
  }

  /** Resolve + start a jukebox track (skipping ones whose files went missing). */
  private async playEntity(entity: V3BeatmapEntity): Promise<void> {
    const media = await this.resolveMediaUrls(entity);
    if (!media) {
      void this.advance();
      return;
    }
    this.currentEntity = entity;
    this.lastPlayedId = entity.idv2;
    this.currentBeatmapId = entity.idv2;
    this.currentMedia = media;
    this.currentTrack.set({ title: entity.title, artist: entity.artist });
    void this.refresh(++this.generation, false);
  }

  private pause(): void {
    if (!this.armed || !this.currentBuffer) return;
    const ctx = this.engine.audio.music.getAudioContext();
    const elapsed = ctx.currentTime - this.playStartedAtSec + this.playStartOffsetSec;
    this.pausedOffsetSec = Math.max(0, Math.min(elapsed, this.currentBuffer.duration - 0.05));
    // Stopping fires the source's `onended` (asynchronously), which must not
    // advance: bump the generation so that stale handler bails, and flag paused.
    this.generation++;
    this.setPaused(true);
    this.engine.audio.music.stop(NOW_PLAYING_AUDIO_ID);
    this.currentSource = null;
    this.armed = false;
  }

  private unpause(): void {
    if (!this.paused || !this.currentBuffer) return;
    this.startPlayback(this.currentBuffer, this.currentLoop, this.pausedOffsetSec);
  }

  private async ensureLibrary(): Promise<void> {
    if (this.library === null) {
      this.library = await latestDb.beatmaps.toArray();
    }
    if (this.queue.length === 0 && this.library.length > 0) {
      // Re-read at each reshuffle so newly installed maps join the rotation.
      this.library = await latestDb.beatmaps.toArray();
      this.queue = this.shuffled(this.library);
    }
  }

  private shuffled(maps: readonly V3BeatmapEntity[]): V3BeatmapEntity[] {
    const arr = maps.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    // Don't replay the just-played track first after a reshuffle.
    if (arr.length > 1 && this.lastPlayedId && arr[0].idv2 === this.lastPlayedId) {
      [arr[0], arr[1]] = [arr[1], arr[0]];
    }
    return arr;
  }

  // ---- playback core ---------------------------------------------------------

  private async refresh(generation: number, loop: boolean): Promise<void> {
    this.stop();

    // When suspended (handing off to gameplay), leave the shared layer alone —
    // the next scene drives it, so the background never blinks to nothing.
    if (!this.live) return;

    const media = this.currentMedia;
    if (!media) {
      // Live but nothing to play (e.g. an empty library) — clear the layer.
      backgroundLayer(this.engine).clear();
      return;
    }

    this.showBackground(media.backgroundUrl);

    const music = this.engine.audio.music;
    let buffer: AudioBuffer;
    try {
      buffer = await music.loadBuffer(media.audioUrl);
    } catch (e) {
      console.error("Failed to load now-playing audio", e);
      return;
    }
    if (generation !== this.generation || !this.live) return;

    // The AudioContext boots suspended; a source started while suspended plays at
    // a wrong offset on resume. Show the background now and defer the audio until
    // a user gesture unlocks the context, then retry.
    if (music.getAudioContext().state !== "running") {
      this.deferUntilUnlocked(() => {
        if (generation === this.generation && this.live) void this.refresh(++this.generation, loop);
      });
      return;
    }

    this.startPlayback(buffer, loop, 0);
  }

  /** Start (or resume-at-offset) playback of a decoded buffer on the channel. */
  private startPlayback(buffer: AudioBuffer, loop: boolean, offsetSec: number): void {
    const music = this.engine.audio.music;
    const source = music.play(NOW_PLAYING_AUDIO_ID, buffer, {
      loop,
      volume: NOW_PLAYING_VOLUME,
      startOffset: offsetSec,
    });
    this.currentSource = source;
    this.currentBuffer = buffer;
    this.currentLoop = loop;
    this.playStartedAtSec = music.getAudioContext().currentTime;
    this.playStartOffsetSec = offsetSec;
    this.armed = true;
    this.setPaused(false);
    this.visualizer.connectSource(source);
    if (!loop) this.installEndedAdvance(source, this.generation);
  }

  private installEndedAdvance(source: AudioBufferSourceNode, generation: number): void {
    source.onended = () => {
      // A manual switch/stop bumps the generation (and pause sets `paused`), so
      // those synchronous onended fires are ignored — only a natural end of the
      // current jukebox track advances.
      if (generation !== this.generation || !this.live || this.mode !== "jukebox" || this.paused) return;
      void this.advance();
    };
  }

  private deferUntilUnlocked(start: () => void): void {
    this.pendingStart = start;
    if (this.unlockHandler) return;
    const handler = () => {
      void this.engine.audio.music.getAudioContext().resume().then(() => {
        this.detachUnlock();
        const fn = this.pendingStart;
        this.pendingStart = null;
        fn?.();
      });
    };
    this.unlockHandler = handler;
    window.addEventListener("pointerdown", handler);
    window.addEventListener("keydown", handler);
  }

  private detachUnlock(): void {
    if (!this.unlockHandler) return;
    window.removeEventListener("pointerdown", this.unlockHandler);
    window.removeEventListener("keydown", this.unlockHandler);
    this.unlockHandler = null;
  }
}

import { motionValue, type MotionValue } from "motion/react";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { BackgroundCrossfader } from "../../entities/BackgroundCrossfader";
import { StickDotsEntity } from "../../entities/StickDotsEntity";
import { easeInOutCubic } from "../../engine/animation/Easing";
import type { Playable } from "../../engine/animation/Playable";
import { tween } from "../../engine/animation/Tween";
import { Container } from "../../engine/Container";
import type { Engine } from "../../engine/Engine";
import type { CircleLayer } from "../../engine/layers/CircleLayer";
import { Store } from "../../engine/state/Store";
import type { TickContext } from "../../engine/TickContext";
import { beatmapSelectionToDownloader } from "../../engine/transitions/factories/beatmapSelectionToDownloader";
import { beatmapSelectionToFilter } from "../../engine/transitions/factories/beatmapSelectionToFilter";
import { beatmapSelectionToGameplay } from "../../engine/transitions/factories/beatmapSelectionToGameplay";
import { beatmapSelectionToMainMenu } from "../../engine/transitions/factories/beatmapSelectionToMainMenu";
import { CircleAudioVisualizer } from "../../flair/CircleAudioVisualizer";
import { DownloaderScene } from "../Downloader/DownloaderScene";
import type { DifficultyFilter } from "../Filter/filterTypes";
import { FilterScene } from "../Filter/FilterScene";
import { GameplayScene } from "../Gameplay/GameplayScene";
import { Scene } from "../Scene";
import { pickIndexAtY } from "../shared/verticalPicker";
import { BeatmapSelectionView } from "./BeatmapSelectionView";
import {
  BUTTON_HEIGHT_PX,
  CIRCLE_RADIUS_PX,
  MAX_SCROLL_SPEED_ITEMS_PER_SEC,
  SCROLL_ZONE_Y_PX,
  STICK_ACTIVE_THRESHOLD,
  VERTICAL_PITCH_PX,
} from "./layout";

export type ScrollZone = "top" | "bottom" | null;
export type BeatmapResolver = (index: number) => Promise<ParsedMap | null>;
export type FocusedBeatmapMedia = { audioUrl: string; backgroundUrl: string };
export type LeaderboardTab = "global" | "local";

export type LeftAction = {
  id: string;
  label: string;
  onActivate: () => void;
};

type Vec2 = { x: number; y: number };

const PREVIEW_AUDIO_ID = "beatmap_preview_audio";
const PREVIEW_AUDIO_VOLUME = 0.7;
const BACKGROUND_CROSSFADE_MS = 300;

/**
 * Stick.x must commit at least this far to one side before we switch focus
 * between the left-action and right-beatmap columns. Pure-vertical pushes
 * fall in the dead zone in between, so the user can scan up/down without
 * accidentally hopping sides.
 */
const SIDE_COMMIT_THRESHOLD = 0.3;

export class BeatmapSelectionScene extends Scene {
  public readonly id = "beatmap-selection";
  public override readonly UI = BeatmapSelectionView;

  public readonly focusedIndex = new Store<number | null>(null);
  public readonly scrollZone = new Store<ScrollZone>(null);
  public readonly leaderboardTab = new Store<LeaderboardTab>("global");
  public readonly focusedLeftButton = new Store<number | null>(null);

  /**
   * Logical id of the currently/last focused beatmap. Lives on the scene
   * (not in a view ref) so it survives view remounts — used by reconciliation
   * to snap focus back to the same beatmap after a filter change or after
   * returning from an overlay scene that altered the list.
   */
  public readonly focusedBeatmapIdv2 = new Store<string | null>(null);

  /**
   * Search and difficulty filter live on the scene (not in the view's useState)
   * so they survive while the view unmounts during gameplay/scores/overlays —
   * when the user pops back here, the list re-renders with the same filter.
   */
  public readonly searchQuery = new Store<string>("");
  public readonly difficultyFilter = new Store<DifficultyFilter | null>(null);

  /**
   * Left-column actions, defined here so both the view (renders them) and the
   * scene (handles stick / d-pad / confirm input for them) see the same
   * source of truth — no need to push counts/handlers through a context.
   */
  public readonly leftActions: readonly LeftAction[] = [
    { id: "filter", label: "Filters", onActivate: () => this.openFilter() },
    { id: "download", label: "Download maps", onActivate: () => this.openDownloader() },
  ];

  /**
   * Continuous scroll position (float). A MotionValue so the view can drive
   * each visible button's transform/mask via useTransform without going
   * through React renders — scrolling is per-frame motion, not state.
   */
  public readonly scrollOffset: MotionValue<number> = motionValue(0);

  private beatmapCount = 0;
  private resolver: BeatmapResolver | null = null;

  private lastGameplayScene: GameplayScene | null = null;

  private root = new Container();
  /** Holds the background crossfader + audio visualizer; fades to 0 during exit transitions. */
  private innerContainer = new Container();
  private circle: CircleLayer;
  private background: BackgroundCrossfader;
  private audioVisualizer: CircleAudioVisualizer;

  private currentMedia: FocusedBeatmapMedia | null = null;
  private mediaGeneration = 0;
  /**
   * Whether the preview source is currently playing. Lets us skip the
   * re-arm in onEntered when the audio survived an overlay scene (downloader/
   * filter) — we don't want to restart the preview from 0 every pop-back.
   */
  private isPreviewArmed = false;

  /** One-shot guard: pick a random map the first time the list arrives. */
  private hasPickedInitialFocus = false;

  constructor(engine: Engine) {
    super(engine);
    this.circle = engine.circle;
    this.background = new BackgroundCrossfader(engine.getSettings(), {
      radius: CIRCLE_RADIUS_PX,
      fadeDurationMs: BACKGROUND_CROSSFADE_MS,
    });
    this.audioVisualizer = new CircleAudioVisualizer(
      engine.getAudio().music.getAudioContext(),
      40,
      CIRCLE_RADIUS_PX,
      30,
    );
    // Inner content renders behind the circle, like in gameplay: background → visualizer.
    this.innerContainer.add(this.background);
    this.innerContainer.add(this.audioVisualizer);
    this.root.add(this.innerContainer);
    this.root.add(this.circle);
    this.root.add(new StickDotsEntity(this.inputSystem, this.circle));
  }

  public override onEntered() {
    this.onAction("back", () => this.goBack());
    this.onAction("confirm", () => void this.confirmFocused());
    this.onAction("leaderboard-prev", () => this.toggleLeaderboardTab());
    this.onAction("leaderboard-next", () => this.toggleLeaderboardTab());
    this.onActionRepeat("nav-up", () => this.navByDPad(-1));
    this.onActionRepeat("nav-down", () => this.navByDPad(+1));
    // Returning from an overlay (downloader/filter) — drop the transient
    // left-column focus so the user lands back on their beatmap. focusedIndex
    // is preserved through overlays so we restore the same selection.
    this.focusedLeftButton.set(null);
    // Exit transitions fade innerContainer to 0; reset before showing again.
    this.innerContainer.alpha = 1;
    // Re-arm preview only if it isn't already playing. Coming back from
    // gameplay/scores: audio was stopped, this restarts it. Coming back
    // from downloader/filter: audio is still playing, no-op.
    if (this.currentMedia && !this.isPreviewArmed) {
      void this.refreshPreviewMedia(++this.mediaGeneration);
    }
  }

  public override onDestroy() {
    this.stopPreviewAudio();
    this.root.detach(this.circle);
    this.root.destroy();
  }

  public override exitFadePlayable(durationMs: number): Playable {
    return tween({
      target: this.innerContainer,
      to: { alpha: 0 },
      duration: durationMs,
      easing: easeInOutCubic,
    });
  }

  public setBeatmapCount(count: number): void {
    if (this.beatmapCount === count) return;
    this.beatmapCount = count;

    if (count > 0 && !this.hasPickedInitialFocus) {
      const randomIndex = Math.floor(Math.random() * count);
      this.focusedIndex.set(randomIndex);
      this.scrollOffset.set(randomIndex);
      this.hasPickedInitialFocus = true;
    } else {
      const maxOffset = Math.max(0, count - 1);
      this.scrollOffset.set(clamp(this.scrollOffset.get(), 0, maxOffset));
      const focused = this.focusedIndex.get();
      if (focused !== null && focused >= count) {
        this.focusedIndex.set(null);
      }
    }
  }

  public setBeatmapResolver(resolver: BeatmapResolver | null): void {
    this.resolver = resolver;
  }

  /**
   * Tell the scene which beatmap is currently hovered. Triggers an audio
   * preview + circle background. Pass null to clear both.
   */
  public setFocusedBeatmapMedia(media: FocusedBeatmapMedia | null): void {
    if (sameMedia(this.currentMedia, media)) return;
    this.currentMedia = media;
    void this.refreshPreviewMedia(++this.mediaGeneration);
  }

  /**
   * D-pad list navigation. Operates on whichever column is currently focused:
   * if the user is on the left action column, moves within it; otherwise
   * moves within the beatmap list and scrolls the visible window to track
   * the new focus.
   */
  private navByDPad(delta: -1 | 1): void {
    const leftFocused = this.focusedLeftButton.get();
    if (leftFocused !== null) {
      const count = this.leftActions.length;
      if (count === 0) return;
      const next = Math.max(0, Math.min(count - 1, leftFocused + delta));
      if (next !== leftFocused) this.focusedLeftButton.set(next);
      return;
    }

    if (this.beatmapCount === 0) return;
    const focused = this.focusedIndex.get();
    if (focused === null) {
      this.focusedIndex.set(0);
      this.scrollTo(0);
      return;
    }
    const next = Math.max(0, Math.min(this.beatmapCount - 1, focused + delta));
    if (next !== focused) {
      this.focusedIndex.set(next);
      this.scrollTo(next);
    }
  }

  public scrollBy(deltaItems: number): void {
    const current = this.scrollOffset.get();
    const next = clamp(current + deltaItems, 0, Math.max(0, this.beatmapCount - 1));
    if (next === current) return;
    this.scrollOffset.set(next);
  }

  public scrollTo(index: number): void {
    this.scrollOffset.set(clamp(index, 0, Math.max(0, this.beatmapCount - 1)));
  }

  public toggleLeaderboardTab(): void {
    this.leaderboardTab.set(this.leaderboardTab.get() === "global" ? "local" : "global");
  }

  public async confirmFocused(): Promise<void> {
    const leftIdx = this.focusedLeftButton.get();
    if (leftIdx !== null) {
      this.leftActions[leftIdx]?.onActivate();
      return;
    }
    const idx = this.focusedIndex.get();
    if (idx === null || !this.resolver) return;
    const parsed = await this.resolver(idx);
    if (parsed) this.playMap(parsed);
  }

  public playMap(map: ParsedMap): void {
    // Stop the preview before transitioning — gameplay starts its own audio
    // from 0 and we don't want any overlap during the cross-fade.
    this.stopPreviewAudio();
    this.lastGameplayScene?.remove();
    const gameplayScene = new GameplayScene(this.engine, map);
    void this.sceneManager.transitionPush(gameplayScene, beatmapSelectionToGameplay);
    this.lastGameplayScene = gameplayScene;
  }

  public goBack(): void {
    this.stopPreviewAudio();
    void this.sceneManager.transitionPop(beatmapSelectionToMainMenu);
  }

  public openDownloader(): void {
    // Preview audio is deliberately left playing — the downloader is just an
    // overlay scene and we want the user's track to keep going behind it.
    void this.sceneManager.transitionPush(
      new DownloaderScene(this.engine),
      beatmapSelectionToDownloader,
    );
  }

  public openFilter(): void {
    void this.sceneManager.transitionPush(
      new FilterScene(this.engine, this.difficultyFilter),
      beatmapSelectionToFilter,
    );
  }

  public override update(tick: TickContext): void {
    if (this.beatmapCount > 0) this.processStickInput(tick.dt);
    this.root.update(tick);
  }

  public override render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    this.root.x = canvas.width / 2;
    this.root.y = canvas.height / 2;
    this.root.render(ctx);
  }

  private processStickInput(dt: number): void {
    const stick = pickActiveStick(this.getStick("left"), this.getStick("right"));
    if (!stick) {
      this.scrollZone.set(null);
      return;
    }

    const stickY = stick.y * CIRCLE_RADIUS_PX;

    if (stickY < -SCROLL_ZONE_Y_PX) {
      this.scrollZone.set("top");
      this.applyContinuousScroll(stickY, -1, dt);
      return;
    }
    if (stickY > SCROLL_ZONE_Y_PX) {
      this.scrollZone.set("bottom");
      this.applyContinuousScroll(stickY, +1, dt);
      return;
    }

    this.scrollZone.set(null);

    if (stick.x > SIDE_COMMIT_THRESHOLD) {
      // Right side: beatmap buttons.
      this.focusedLeftButton.set(null);
      const picked = this.pickButtonAtY(stickY);
      if (picked !== null) this.focusedIndex.set(picked);
    } else if (stick.x < -SIDE_COMMIT_THRESHOLD) {
      // Left side: action buttons. focusedIndex is intentionally NOT cleared
      // — it's the "last focused beatmap" we restore to on overlay close. The
      // view hides the beatmap focus while focusedLeftButton is set.
      if (this.leftActions.length === 0) return;
      const picked = this.pickLeftButtonAtY(stickY);
      if (picked !== null) this.focusedLeftButton.set(picked);
    }
    // Otherwise: pure-vertical push, keep current focus.
  }

  private pickLeftButtonAtY(targetY: number): number | null {
    return pickIndexAtY({
      targetY,
      count: this.leftActions.length,
      pitchPx: VERTICAL_PITCH_PX,
      halfHeightPx: BUTTON_HEIGHT_PX / 2,
      // Mirrors getLeftButtonYCenter — buttons centred symmetrically around y=0.
      originItems: (this.leftActions.length - 1) / 2,
    });
  }

  private applyContinuousScroll(stickY: number, direction: 1 | -1, dt: number): void {
    const overshoot = Math.abs(stickY) - SCROLL_ZONE_Y_PX;
    const range = CIRCLE_RADIUS_PX - SCROLL_ZONE_Y_PX;
    const intensity = Math.min(1, overshoot / Math.max(1, range));
    this.scrollBy(direction * intensity * MAX_SCROLL_SPEED_ITEMS_PER_SEC * (dt / 1000));
  }

  private pickButtonAtY(targetY: number): number | null {
    return pickIndexAtY({
      targetY,
      count: this.beatmapCount,
      pitchPx: VERTICAL_PITCH_PX,
      halfHeightPx: BUTTON_HEIGHT_PX / 2,
      originItems: this.scrollOffset.get(),
    });
  }

  private async refreshPreviewMedia(generation: number): Promise<void> {
    this.stopPreviewAudio();

    const media = this.currentMedia;
    if (!media || !this.isActive()) {
      this.background.setSource(null);
      return;
    }

    this.background.setSource(media.backgroundUrl);

    const music = this.engine.getAudio().music;
    let buffer: AudioBuffer;
    try {
      buffer = await music.loadBuffer(media.audioUrl);
    } catch (e) {
      console.error("Failed to load preview audio", e);
      return;
    }
    if (generation !== this.mediaGeneration || !this.isActive()) return;
    const source = music.play(PREVIEW_AUDIO_ID, buffer, { loop: true, volume: PREVIEW_AUDIO_VOLUME });
    this.audioVisualizer.connectSource(source);
    this.isPreviewArmed = true;
  }

  private stopPreviewAudio(): void {
    this.engine.getAudio().music.stop(PREVIEW_AUDIO_ID);
    this.isPreviewArmed = false;
  }
}

function sameMedia(a: FocusedBeatmapMedia | null, b: FocusedBeatmapMedia | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.audioUrl === b.audioUrl && a.backgroundUrl === b.backgroundUrl;
}

function pickActiveStick(left: Vec2, right: Vec2): Vec2 | null {
  const lm = Math.hypot(left.x, left.y);
  const rm = Math.hypot(right.x, right.y);
  const dominantMagnitude = Math.max(lm, rm);
  if (dominantMagnitude < STICK_ACTIVE_THRESHOLD) return null;
  return lm >= rm ? left : right;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

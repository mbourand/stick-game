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
import { beatmapSelectionToGameplay } from "../../engine/transitions/factories/beatmapSelectionToGameplay";
import { beatmapSelectionToMainMenu } from "../../engine/transitions/factories/beatmapSelectionToMainMenu";
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

/**
 * Snapshot of UI-owned input routing — pushed in from the view in a single
 * call so the scene sees a coherent state rather than tracking N separate
 * setters that can be out of sync mid-render.
 *
 *   - blocked:     true while a modal owns input. Gamepad nav, confirm, and
 *                  leaderboard cycling silently no-op.
 *   - backHandler: when set, the back action invokes this instead of `goBack`
 *                  — modals use it to close themselves.
 *   - leftActions: left-column buttons currently rendered by the view; count
 *                  bounds stick picking, onConfirm fires on activation.
 */
export type BeatmapSelectionUIContext = {
  blocked: boolean;
  backHandler: (() => void) | null;
  leftActions: {
    count: number;
    onConfirm: (index: number) => void;
  };
};

const DEFAULT_UI_CONTEXT: BeatmapSelectionUIContext = {
  blocked: false,
  backHandler: null,
  leftActions: { count: 0, onConfirm: () => {} },
};

export class BeatmapSelectionScene extends Scene {
  public readonly id = "beatmap-selection";
  public override readonly UI = BeatmapSelectionView;

  public readonly focusedIndex = new Store<number | null>(null);
  public readonly scrollZone = new Store<ScrollZone>(null);
  public readonly leaderboardTab = new Store<LeaderboardTab>("global");
  public readonly focusedLeftButton = new Store<number | null>(null);

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
  /** Holds the background crossfader; fades to 0 during exit transitions. */
  private innerContainer = new Container();
  private circle: CircleLayer;
  private background: BackgroundCrossfader;

  private currentMedia: FocusedBeatmapMedia | null = null;
  private mediaGeneration = 0;

  /** One-shot guard: pick a random map the first time the list arrives. */
  private hasPickedInitialFocus = false;

  private uiContext: BeatmapSelectionUIContext = DEFAULT_UI_CONTEXT;

  constructor(engine: Engine) {
    super(engine);
    this.circle = engine.getPersistentRoot().circle;
    this.background = new BackgroundCrossfader(engine.getSettings(), {
      radius: CIRCLE_RADIUS_PX,
      fadeDurationMs: BACKGROUND_CROSSFADE_MS,
    });
    // Inner content (background) renders behind the circle, like in gameplay.
    this.innerContainer.add(this.background);
    this.root.add(this.innerContainer);
    this.root.add(this.circle);
    this.root.add(new StickDotsEntity(this.inputSystem, this.circle));
  }

  public override onEntered() {
    // Back is never blocked — it's the user's escape from overlays back into
    // the scene, then from the scene back to the main menu.
    this.onAction("back", () => {
      const handler = this.uiContext.backHandler;
      if (handler) {
        handler();
        return;
      }
      this.goBack();
    });
    this.onAction("confirm", () => {
      if (this.uiContext.blocked) return;
      void this.confirmFocused();
    });
    this.onAction("leaderboard-prev", () => {
      if (this.uiContext.blocked) return;
      this.toggleLeaderboardTab();
    });
    this.onAction("leaderboard-next", () => {
      if (this.uiContext.blocked) return;
      this.toggleLeaderboardTab();
    });
    // Exit transitions fade innerContainer to 0; reset before showing again.
    this.innerContainer.alpha = 1;
    // Coming back from scores etc.: re-arm the preview for the still-focused map.
    if (this.currentMedia) void this.refreshPreviewMedia(++this.mediaGeneration);
  }

  public override onBeforeExit() {
    this.stopPreviewAudio();
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

  /**
   * Single sync point for everything the view tells the scene about input
   * routing — replaces a stack of individual setters that the view had to
   * keep in lockstep via separate effects.
   */
  public setUIContext(ctx: BeatmapSelectionUIContext): void {
    const prev = this.uiContext;
    this.uiContext = ctx;

    if (prev.leftActions.count !== ctx.leftActions.count) {
      const focused = this.focusedLeftButton.get();
      if (focused !== null && focused >= ctx.leftActions.count) {
        this.focusedLeftButton.set(null);
      }
    }
    if (!prev.blocked && ctx.blocked) {
      // Drop transient input state so nothing's mid-scroll when control returns.
      this.scrollZone.set(null);
    }
  }

  public resetUIContext(): void {
    this.setUIContext(DEFAULT_UI_CONTEXT);
  }

  public async confirmFocused(): Promise<void> {
    const leftIdx = this.focusedLeftButton.get();
    if (leftIdx !== null) {
      this.uiContext.leftActions.onConfirm(leftIdx);
      return;
    }
    const idx = this.focusedIndex.get();
    if (idx === null || !this.resolver) return;
    const parsed = await this.resolver(idx);
    if (parsed) this.playMap(parsed);
  }

  public playMap(map: ParsedMap): void {
    this.lastGameplayScene?.remove();
    const gameplayScene = new GameplayScene(this.engine, map);
    void this.sceneManager.transitionPush(gameplayScene, beatmapSelectionToGameplay);
    this.lastGameplayScene = gameplayScene;
  }

  public goBack(): void {
    void this.sceneManager.transitionPop(beatmapSelectionToMainMenu);
  }

  public override update(tick: TickContext): void {
    if (this.beatmapCount > 0 && !this.uiContext.blocked) this.processStickInput(tick.dt);
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
      // Left side: action buttons.
      if (this.uiContext.leftActions.count === 0) return;
      this.focusedIndex.set(null);
      const picked = this.pickLeftButtonAtY(stickY);
      if (picked !== null) this.focusedLeftButton.set(picked);
    }
    // Otherwise: pure-vertical push, keep current focus.
  }

  private pickLeftButtonAtY(targetY: number): number | null {
    return pickIndexAtY({
      targetY,
      count: this.uiContext.leftActions.count,
      pitchPx: VERTICAL_PITCH_PX,
      halfHeightPx: BUTTON_HEIGHT_PX / 2,
      // Mirrors getLeftButtonYCenter — buttons centred symmetrically around y=0.
      originItems: (this.uiContext.leftActions.count - 1) / 2,
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
    music.play(PREVIEW_AUDIO_ID, buffer, { loop: true, volume: PREVIEW_AUDIO_VOLUME });
  }

  private stopPreviewAudio(): void {
    this.engine.getAudio().music.stop(PREVIEW_AUDIO_ID);
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

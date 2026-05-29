import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { BackgroundCrossfader } from "../../entities/BackgroundCrossfader";
import { StickDotsEntity } from "../../entities/StickDotsEntity";
import { easeInOutCubic } from "../../engine/animation/Easing";
import type { Playable } from "../../engine/animation/Playable";
import { tween } from "../../engine/animation/Tween";
import { Container } from "../../engine/Container";
import type { Engine } from "../../engine/Engine";
import type { CircleLayer } from "../../engine/layers/CircleLayer";
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

type Listener = () => void;
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

export class BeatmapSelectionScene extends Scene {
  public readonly id = "beatmap-selection";
  public override readonly UI = BeatmapSelectionView;

  private focusedIndex: number | null = null;
  private scrollOffset = 0;
  private scrollZone: ScrollZone = null;
  private beatmapCount = 0;
  private resolver: BeatmapResolver | null = null;

  private discreteListeners = new Set<Listener>();
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

  private leaderboardTab: LeaderboardTab = "global";

  private leftButtonCount = 0;
  private focusedLeftButton: number | null = null;
  private leftConfirmHandler: ((index: number) => void) | null = null;

  /** When true, gamepad navigation + confirm + leaderboard cycling no-op so an overlay can own input. */
  private inputBlocked = false;
  /** When set, the back action invokes this instead of `goBack` — used by modals to close themselves. */
  private modalBackHandler: (() => void) | null = null;

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
      if (this.modalBackHandler) {
        this.modalBackHandler();
        return;
      }
      this.goBack();
    });
    this.onAction("confirm", () => {
      if (this.inputBlocked) return;
      void this.confirmFocused();
    });
    this.onAction("leaderboard-prev", () => {
      if (this.inputBlocked) return;
      this.toggleLeaderboardTab();
    });
    this.onAction("leaderboard-next", () => {
      if (this.inputBlocked) return;
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

  /** Discrete state (focused index, scroll zone) — drives React re-renders. */
  public subscribe = (listener: Listener) => {
    this.discreteListeners.add(listener);
    return () => {
      this.discreteListeners.delete(listener);
    };
  };

  public getFocusedIndex = (): number | null => this.focusedIndex;
  public getScrollZone = (): ScrollZone => this.scrollZone;

  /** Continuous scroll position, read each frame by the view's useFrame. */
  public getScrollOffset = (): number => this.scrollOffset;

  public setBeatmapCount(count: number): void {
    if (this.beatmapCount === count) return;
    this.beatmapCount = count;

    if (count > 0 && !this.hasPickedInitialFocus) {
      const randomIndex = Math.floor(Math.random() * count);
      this.focusedIndex = randomIndex;
      this.scrollOffset = randomIndex;
      this.hasPickedInitialFocus = true;
    } else {
      const maxOffset = Math.max(0, count - 1);
      this.scrollOffset = clamp(this.scrollOffset, 0, maxOffset);
      if (this.focusedIndex !== null && this.focusedIndex >= count) {
        this.focusedIndex = null;
      }
    }
    this.notify();
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

  public setFocused(index: number | null): void {
    if (this.focusedIndex === index) return;
    this.focusedIndex = index;
    this.notify();
  }

  public scrollBy(deltaItems: number): void {
    const next = clamp(this.scrollOffset + deltaItems, 0, Math.max(0, this.beatmapCount - 1));
    if (next === this.scrollOffset) return;
    this.scrollOffset = next;
  }

  public scrollTo(index: number): void {
    this.scrollOffset = clamp(index, 0, Math.max(0, this.beatmapCount - 1));
  }

  public getLeaderboardTab = (): LeaderboardTab => this.leaderboardTab;

  public setLeaderboardTab(tab: LeaderboardTab): void {
    if (this.leaderboardTab === tab) return;
    this.leaderboardTab = tab;
    this.notify();
  }

  public toggleLeaderboardTab(): void {
    this.setLeaderboardTab(this.leaderboardTab === "global" ? "local" : "global");
  }

  public setLeftButtonCount(count: number): void {
    if (this.leftButtonCount === count) return;
    this.leftButtonCount = count;
    if (this.focusedLeftButton !== null && this.focusedLeftButton >= count) {
      this.focusedLeftButton = null;
    }
    this.notify();
  }

  public setLeftConfirmHandler(handler: ((index: number) => void) | null): void {
    this.leftConfirmHandler = handler;
  }

  public getFocusedLeftButton = (): number | null => this.focusedLeftButton;

  public setFocusedLeftButton(index: number | null): void {
    if (this.focusedLeftButton === index) return;
    this.focusedLeftButton = index;
    this.notify();
  }

  public async confirmFocused(): Promise<void> {
    if (this.focusedLeftButton !== null) {
      this.leftConfirmHandler?.(this.focusedLeftButton);
      return;
    }
    if (this.focusedIndex === null || !this.resolver) return;
    const parsed = await this.resolver(this.focusedIndex);
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
    if (this.beatmapCount > 0 && !this.inputBlocked) this.processStickInput(tick.dt);
    this.root.update(tick);
  }

  public setInputBlocked(blocked: boolean): void {
    if (this.inputBlocked === blocked) return;
    this.inputBlocked = blocked;
    if (blocked) {
      // Clear transient input state so nothing's mid-scroll when control returns.
      this.setScrollZone(null);
    }
  }

  public setModalBackHandler(handler: (() => void) | null): void {
    this.modalBackHandler = handler;
  }

  public override render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    this.root.x = canvas.width / 2;
    this.root.y = canvas.height / 2;
    this.root.render(ctx);
  }

  private processStickInput(dt: number): void {
    const stick = pickActiveStick(this.getStick("left"), this.getStick("right"));
    if (!stick) {
      this.setScrollZone(null);
      return;
    }

    const stickY = stick.y * CIRCLE_RADIUS_PX;

    if (stickY < -SCROLL_ZONE_Y_PX) {
      this.setScrollZone("top");
      this.applyContinuousScroll(stickY, -1, dt);
      return;
    }
    if (stickY > SCROLL_ZONE_Y_PX) {
      this.setScrollZone("bottom");
      this.applyContinuousScroll(stickY, +1, dt);
      return;
    }

    this.setScrollZone(null);

    if (stick.x > SIDE_COMMIT_THRESHOLD) {
      // Right side: beatmap buttons.
      this.setFocusedLeftButton(null);
      const picked = this.pickButtonAtY(stickY);
      if (picked !== null) this.setFocused(picked);
    } else if (stick.x < -SIDE_COMMIT_THRESHOLD) {
      // Left side: action buttons.
      if (this.leftButtonCount === 0) return;
      this.setFocused(null);
      const picked = this.pickLeftButtonAtY(stickY);
      if (picked !== null) this.setFocusedLeftButton(picked);
    }
    // Otherwise: pure-vertical push, keep current focus.
  }

  private pickLeftButtonAtY(targetY: number): number | null {
    return pickIndexAtY({
      targetY,
      count: this.leftButtonCount,
      pitchPx: VERTICAL_PITCH_PX,
      halfHeightPx: BUTTON_HEIGHT_PX / 2,
      // Mirrors getLeftButtonYCenter — buttons centred symmetrically around y=0.
      originItems: (this.leftButtonCount - 1) / 2,
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
      originItems: this.scrollOffset,
    });
  }

  private setScrollZone(zone: ScrollZone): void {
    if (this.scrollZone === zone) return;
    this.scrollZone = zone;
    this.notify();
  }

  private notify(): void {
    for (const listener of this.discreteListeners) listener();
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

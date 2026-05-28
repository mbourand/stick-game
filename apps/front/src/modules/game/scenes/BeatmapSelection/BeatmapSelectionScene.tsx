import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { BackgroundEntity } from "../../entities/BackgroundEntity";
import { StickDotsEntity } from "../../entities/StickDotsEntity";
import { Container } from "../../engine/Container";
import type { Engine } from "../../engine/Engine";
import type { CircleLayer } from "../../engine/layers/CircleLayer";
import type { TickContext } from "../../engine/TickContext";
import { beatmapSelectionToGameplay } from "../../engine/transitions/factories/beatmapSelectionToGameplay";
import { beatmapSelectionToMainMenu } from "../../engine/transitions/factories/beatmapSelectionToMainMenu";
import { GameplayScene } from "../Gameplay/GameplayScene";
import { Scene } from "../Scene";
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

type Vec2 = { x: number; y: number };

const PREVIEW_AUDIO_ID = "beatmap_preview_audio";
const PREVIEW_AUDIO_VOLUME = 0.7;
const BACKGROUND_CROSSFADE_MS = 300;

type BackgroundLayer = { container: Container; entity: BackgroundEntity };

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
  /** Public so exit transitions can tween its alpha alongside the ring resize. */
  public innerContainer = new Container();
  private circle: CircleLayer;

  private currentMedia: FocusedBeatmapMedia | null = null;
  private mediaGeneration = 0;
  /** Background currently at full opacity. Replaced once an incoming finishes fading in. */
  private stableBackground: BackgroundLayer | null = null;
  /** Background currently fading from alpha 0 → 1 on top of `stableBackground`. */
  private incomingBackground: BackgroundLayer | null = null;
  private incomingFadeElapsedMs = 0;

  constructor(engine: Engine) {
    super(engine);
    this.circle = engine.getPersistentRoot().circle;
    // Inner content (background) renders behind the circle, like in gameplay.
    this.root.add(this.innerContainer);
    this.root.add(this.circle);
    this.root.add(new StickDotsEntity(this.inputSystem));
  }

  public override onEntered() {
    this.onAction("back", () => this.goBack());
    this.onAction("confirm", () => void this.confirmFocused());
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
    this.clearBackground();
    this.root.detach(this.circle);
    this.root.destroy();
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
    const maxOffset = Math.max(0, count - 1);
    this.scrollOffset = clamp(this.scrollOffset, 0, maxOffset);
    if (this.focusedIndex !== null && this.focusedIndex >= count) {
      this.focusedIndex = null;
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

  public async confirmFocused(): Promise<void> {
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
    if (this.beatmapCount > 0) this.processStickInput(tick.dt);
    this.tickBackgroundFade(tick.dt);
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

    // Buttons live on the right of the circle — only point at them with x > 0.
    if (stick.x <= 0) return;

    const picked = this.pickButtonAtY(stickY);
    if (picked !== null) this.setFocused(picked);
  }

  private applyContinuousScroll(stickY: number, direction: 1 | -1, dt: number): void {
    const overshoot = Math.abs(stickY) - SCROLL_ZONE_Y_PX;
    const range = CIRCLE_RADIUS_PX - SCROLL_ZONE_Y_PX;
    const intensity = Math.min(1, overshoot / Math.max(1, range));
    this.scrollBy(direction * intensity * MAX_SCROLL_SPEED_ITEMS_PER_SEC * (dt / 1000));
  }

  private pickButtonAtY(targetY: number): number | null {
    const indexFloat = this.scrollOffset + targetY / VERTICAL_PITCH_PX;
    const candidate = Math.round(indexFloat);
    if (candidate < 0 || candidate >= this.beatmapCount) return null;
    const candidateY = (candidate - this.scrollOffset) * VERTICAL_PITCH_PX;
    if (Math.abs(candidateY - targetY) > BUTTON_HEIGHT_PX / 2) return null;
    return candidate;
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
      this.clearBackground();
      return;
    }

    this.pushIncomingBackground(media.backgroundUrl);

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

  /**
   * Add a new background that fades in over BACKGROUND_CROSSFADE_MS. If one was
   * already fading in, snap it to fully opaque and promote it to the stable
   * slot first — that way we never accumulate more than two layers even when
   * the user changes focus faster than the crossfade duration.
   */
  private pushIncomingBackground(backgroundUrl: string): void {
    if (this.incomingBackground) {
      this.incomingBackground.container.alpha = 1;
      this.replaceStableWith(this.incomingBackground);
      this.incomingBackground = null;
    }

    const entity = new BackgroundEntity(
      { backgroundUrl, backgroundOffsetX: 0, backgroundOffsetY: 0 },
      this.engine.getSettings(),
      { radius: CIRCLE_RADIUS_PX },
    );
    const container = new Container({ alpha: 0 });
    container.add(entity);
    // Added last → rendered on top of the stable background.
    this.innerContainer.add(container);

    this.incomingBackground = { container, entity };
    this.incomingFadeElapsedMs = 0;
  }

  private tickBackgroundFade(dt: number): void {
    if (!this.incomingBackground) return;
    this.incomingFadeElapsedMs += dt;
    const progress = Math.min(1, this.incomingFadeElapsedMs / BACKGROUND_CROSSFADE_MS);
    this.incomingBackground.container.alpha = progress;
    if (progress >= 1) {
      this.replaceStableWith(this.incomingBackground);
      this.incomingBackground = null;
      this.incomingFadeElapsedMs = 0;
    }
  }

  private replaceStableWith(layer: BackgroundLayer): void {
    if (this.stableBackground) {
      this.innerContainer.remove(this.stableBackground.container);
    }
    this.stableBackground = layer;
  }

  private stopPreviewAudio(): void {
    this.engine.getAudio().music.stop(PREVIEW_AUDIO_ID);
  }

  private clearBackground(): void {
    if (this.incomingBackground) {
      this.innerContainer.remove(this.incomingBackground.container);
      this.incomingBackground = null;
    }
    if (this.stableBackground) {
      this.innerContainer.remove(this.stableBackground.container);
      this.stableBackground = null;
    }
    this.incomingFadeElapsedMs = 0;
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
  const candidate = lm >= rm ? left : right;
  if (Math.hypot(candidate.x, candidate.y) < STICK_ACTIVE_THRESHOLD) return null;
  return candidate;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

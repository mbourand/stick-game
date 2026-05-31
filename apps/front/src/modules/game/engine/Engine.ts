import { Audio } from "../../audio/Audio";
import { Gamepad } from "../../gamepad/Gamepad";
import { Settings, settings as defaultSettings } from "../../settings/Settings";
import { CircleLayer } from "../entities/CircleLayer";
import { createGamepadAdapter } from "../input/GamepadAdapter";
import { createKeyboardAdapter } from "../input/KeyboardAdapter";
import { InputSystem } from "../input/InputSystem";
import { SceneManager } from "../scenes/SceneManager";
import { PlayableScheduler } from "./animation/PlayableScheduler";
import { RealtimeClock } from "./Clock";
import { FrameLoop } from "./FrameLoop";
import type { TickContext } from "./TickContext";
import { computeViewportScale, createViewportStore } from "./Viewport";

export type FrameCallback = (tick: TickContext) => void;

export type EngineOptions = {
  settings?: Settings;
  /** Color used to clear the canvas before each frame. Defaults to "black". */
  clearColor?: string;
};

/**
 * Top-level container for the game runtime. The Engine's job is narrow:
 *
 *   - Own the long-lived subsystems (settings, audio, input, scenes,
 *     scheduler, the persistent ring) and expose them as public readonly
 *     fields — every caller reaches subsystems the same way.
 *   - Drive the per-frame tick: ask `FrameLoop` for `dt`, build a
 *     `TickContext`, then advance input → playables → scenes → render.
 *   - Forward external frame subscriptions to React via `frameCallbacks`.
 *
 * Anything game-specific (note spawning, scoring, music) lives in scenes;
 * the Engine just makes sure they get ticked.
 */
export class Engine {
  public readonly settings: Settings;
  public readonly audio = new Audio();
  public readonly inputSystem: InputSystem;
  public readonly sceneManager = new SceneManager(this);
  public readonly playables = new PlayableScheduler();
  /** The persistent ring referenced by whichever scene is on top. Survives scene swaps. */
  public readonly circle = new CircleLayer();
  /**
   * Live viewport metrics (size, dpr, design→screen scale). The Engine keeps
   * the canvas backing store and this store in sync on every resize; canvas
   * scenes and the DOM overlay both read `scale` so they stay pixel-locked.
   */
  public readonly viewport = createViewportStore();

  private readonly clearColor: string;
  private readonly realtimeClock = new RealtimeClock();
  private readonly frameLoop = new FrameLoop();
  private readonly frameCallbacks = new Set<FrameCallback>();

  private canvas: HTMLCanvasElement | null = null;
  private offSettingChanged: (() => void) | null = null;

  constructor(opts: EngineOptions = {}) {
    this.settings = opts.settings ?? defaultSettings;
    this.clearColor = opts.clearColor ?? "black";
    this.inputSystem = new InputSystem([
      createGamepadAdapter(new Gamepad(this.settings)),
      createKeyboardAdapter(),
    ]);
  }

  public start(canvas: HTMLCanvasElement): void {
    if (this.frameLoop.isRunning()) return;
    this.canvas = canvas;
    this.syncViewport();
    window.addEventListener("resize", this.onResize);
    this.offSettingChanged = bindMasterVolumeToSettings(this.audio, this.settings);
    this.frameLoop.start(this.tick);
  }

  public stop(): void {
    this.frameLoop.stop();
    window.removeEventListener("resize", this.onResize);
    this.offSettingChanged?.();
    this.offSettingChanged = null;
    this.sceneManager.clearScenes();
    this.inputSystem.destroy();
    this.audio.destroy();
  }

  private onResize = (): void => this.syncViewport();

  /**
   * Resize the canvas backing store to the viewport at full device-pixel
   * resolution (crisp on HiDPI) and publish the new metrics. The backing store
   * is `css * dpr` device px while the element stays `css` px on screen; canvas
   * scenes fold `dpr * scale` into their root transform so design-space content
   * lands at the right on-screen size.
   */
  private syncViewport(): void {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));

    this.viewport.set({
      cssWidth,
      cssHeight,
      dpr,
      scale: computeViewportScale(cssWidth, cssHeight),
    });
  }

  public registerFrameCallback(callback: FrameCallback): () => void {
    this.frameCallbacks.add(callback);
    return () => {
      this.frameCallbacks.delete(callback);
    };
  }

  private tick = (dt: number, frame: number): void => {
    if (!this.canvas) return;

    this.realtimeClock.advance(dt);
    const tick: TickContext = { dt, realtime: this.realtimeClock.now(), frame };

    this.inputSystem.update();
    this.playables.update(dt);
    this.sceneManager.update(tick);
    this.render();

    for (const cb of this.frameCallbacks) cb(tick);
  };

  private render(): void {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = this.clearColor;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.sceneManager.render(this.canvas, ctx);
  }
}

/**
 * Keep the audio master volume in sync with the `volume` setting. Returns a
 * disposer that detaches the subscription.
 */
function bindMasterVolumeToSettings(audio: Audio, settings: Settings): () => void {
  audio.setMasterVolume(settings.get().volume);
  return settings.events.on("onSettingChanged", (e) => {
    if (e.key === "volume") audio.setMasterVolume(settings.get().volume);
  });
}

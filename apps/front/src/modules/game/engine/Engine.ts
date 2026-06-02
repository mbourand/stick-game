import { Audio } from "../../audio/Audio";
import { bindAudioToSettings } from "../../audio/bindAudioToSettings";
import { Gamepad } from "../../gamepad/Gamepad";
import { Settings, settings as defaultSettings } from "../../settings/Settings";
import { createGamepadAdapter } from "../input/GamepadAdapter";
import { createKeyboardAdapter } from "../input/KeyboardAdapter";
import { InputSystem } from "../input/InputSystem";
import { SceneManager } from "../scenes/SceneManager";
import { PlayableScheduler } from "./animation/PlayableScheduler";
import { CanvasSurface } from "./CanvasSurface";
import { RealtimeClock } from "./Clock";
import type { Entity } from "./Entity";
import { FrameLoop } from "./FrameLoop";
import type { TickContext } from "./TickContext";
import { createViewportStore } from "./Viewport";

export type FrameCallback = (tick: TickContext) => void;

export type EngineOptions = {
  settings?: Settings;
  /** Color used to clear the canvas before each frame. Defaults to "black". */
  clearColor?: string;
  /**
   * Long-lived subsystems. Each defaults to a standard concrete built from the
   * resolved settings — pass an override to swap in a fake (tests) or a
   * different implementation (alternate surfaces). Injected rather than
   * hard-`new`'d so the Engine doesn't dictate its own collaborators.
   */
  audio?: Audio;
  gamepad?: Gamepad;
  inputSystem?: InputSystem;
};

/**
 * Top-level container for the game runtime. The Engine's job is narrow:
 *
 *   - Own the long-lived subsystems (settings, audio, input, scenes,
 *     scheduler) and expose them as public readonly fields — every caller
 *     reaches subsystems the same way.
 *   - Drive the per-frame tick: ask `FrameLoop` for `dt`, build a
 *     `TickContext`, then advance input → playables → scenes → render.
 *   - Forward external frame subscriptions to React via `frameCallbacks`.
 *
 * Anything game-specific (note spawning, scoring, music, the ring) lives in
 * scenes or the persistent-entity registry; the Engine just makes sure things
 * get ticked. It knows nothing about any particular game's entities.
 */
export class Engine {
  public readonly settings: Settings;
  public readonly audio: Audio;
  /** Auto-detecting gamepad. Exposed so the UI can react to connect/disconnect. */
  public readonly gamepad: Gamepad;
  public readonly inputSystem: InputSystem;
  public readonly sceneManager = new SceneManager(this);
  public readonly playables = new PlayableScheduler();
  /**
   * Entities that must outlive individual scenes (e.g. a persistent ring shared
   * across screens). Keyed by an opaque string the game owns; the Engine never
   * inspects what's inside. Scenes borrow these into their tree and `detach`
   * (not destroy) them on the way out.
   */
  public readonly persistentEntities = new Map<string, Entity>();
  /**
   * Live viewport metrics (size, dpr, design→screen scale), kept in sync by the
   * CanvasSurface. Canvas scenes and the DOM overlay both read `scale` so they
   * stay pixel-locked.
   */
  public readonly viewport = createViewportStore();

  private readonly clearColor: string;
  private readonly realtimeClock = new RealtimeClock();
  private readonly frameLoop = new FrameLoop();
  private readonly frameCallbacks = new Set<FrameCallback>();

  private surface: CanvasSurface | null = null;
  private offSettingChanged: (() => void) | null = null;

  constructor(opts: EngineOptions = {}) {
    this.settings = opts.settings ?? defaultSettings;
    this.clearColor = opts.clearColor ?? "black";
    this.audio = opts.audio ?? new Audio();
    this.gamepad = opts.gamepad ?? new Gamepad(this.settings);
    this.inputSystem =
      opts.inputSystem ??
      new InputSystem([createGamepadAdapter(this.gamepad), createKeyboardAdapter()]);
  }

  public start(canvas: HTMLCanvasElement): void {
    if (this.frameLoop.isRunning()) return;
    this.surface = new CanvasSurface(canvas, this.viewport);
    this.offSettingChanged = bindAudioToSettings(this.audio, this.settings);
    this.frameLoop.start(this.tick);
  }

  public stop(): void {
    this.frameLoop.stop();
    this.offSettingChanged?.();
    this.offSettingChanged = null;
    this.surface?.destroy();
    this.surface = null;
    this.sceneManager.clearScenes();
    this.inputSystem.destroy();
    this.audio.destroy();
  }

  public registerFrameCallback(callback: FrameCallback): () => void {
    this.frameCallbacks.add(callback);
    return () => {
      this.frameCallbacks.delete(callback);
    };
  }

  private tick = (dt: number, frame: number): void => {
    if (!this.surface) return;

    this.realtimeClock.advance(dt);
    const tick: TickContext = { dt, realtime: this.realtimeClock.now(), frame };

    this.inputSystem.update();
    this.playables.update(dt);
    this.sceneManager.update(tick);
    this.render();

    for (const cb of this.frameCallbacks) cb(tick);
  };

  private render(): void {
    if (!this.surface) return;
    this.surface.clear(this.clearColor);
    this.sceneManager.render(this.surface.canvas, this.surface.context);
  }
}

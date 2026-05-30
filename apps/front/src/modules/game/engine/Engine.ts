import { Audio } from "../../audio/Audio";
import { Gamepad } from "../../gamepad/Gamepad";
import { Settings, settings as defaultSettings } from "../../settings/Settings";
import { InputSystem } from "../input/InputSystem";
import { SceneManager } from "../scenes/SceneManager";
import { PlayableScheduler } from "./animation/PlayableScheduler";
import { RealtimeClock } from "./Clock";
import { CircleLayer } from "./layers/CircleLayer";
import type { TickContext } from "./TickContext";

export type FrameCallback = (tick: TickContext) => void;

export type EngineOptions = {
  settings?: Settings;
};

export class Engine {
  private rafId: number | null = null;
  private running = false;
  private lastFrameTime = 0;
  private frame = 0;

  private canvas: HTMLCanvasElement | null = null;

  private readonly settings: Settings;
  private readonly realtimeClock = new RealtimeClock();
  /** The persistent ring referenced by whichever scene is on top. Survives scene swaps. */
  public readonly circle = new CircleLayer();
  /**
   * Engine-level Playable scheduler. Ticked every frame independently of any
   * per-scene state, so playables scheduled here keep running across scene
   * swaps. Used by SceneManager to drive transition choreographies and by any
   * scene that needs a fade/move to outlive its own teardown (see GameplayScene
   * fading content while the pause scene's DOM exit plays).
   */
  public readonly playables = new PlayableScheduler();
  private readonly sceneManager = new SceneManager(this);
  private readonly gamepad: Gamepad;
  private readonly inputSystem: InputSystem;
  private readonly audio = new Audio();

  private readonly frameCallbacks = new Set<FrameCallback>();
  private offSettingChanged: (() => void) | null = null;

  constructor(opts: EngineOptions = {}) {
    this.settings = opts.settings ?? defaultSettings;
    this.gamepad = new Gamepad(this.settings);
    this.inputSystem = new InputSystem(this.gamepad);
  }

  public start(canvas: HTMLCanvasElement) {
    if (this.running) return;
    this.canvas = canvas;

    this.audio.setMasterVolume(this.settings.get().volume);
    this.offSettingChanged = this.settings.events.on("onSettingChanged", (e) => {
      if (e.key === "volume") this.audio.setMasterVolume(this.settings.get().volume);
    });

    this.running = true;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  public stop() {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.offSettingChanged?.();
    this.offSettingChanged = null;
    this.sceneManager.clearScenes();
    this.inputSystem.destroy();
    this.gamepad.destroy();
    this.audio.destroy();
  }

  public getSceneManager(): SceneManager {
    return this.sceneManager;
  }

  public getInputSystem(): InputSystem {
    return this.inputSystem;
  }

  public getAudio(): Audio {
    return this.audio;
  }

  public getSettings(): Settings {
    return this.settings;
  }

  public registerFrameCallback(callback: FrameCallback): () => void {
    this.frameCallbacks.add(callback);
    return () => {
      this.frameCallbacks.delete(callback);
    };
  }

  private loop = () => {
    if (!this.running || !this.canvas) return;

    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    this.frame += 1;

    this.realtimeClock.advance(dt);

    const tick: TickContext = {
      dt,
      realtime: this.realtimeClock.now(),
      frame: this.frame,
    };

    this.gamepad.tick();
    this.inputSystem.update();
    this.playables.update(dt);
    this.sceneManager.update(tick);
    this.render();

    for (const cb of this.frameCallbacks) cb(tick);

    this.rafId = requestAnimationFrame(this.loop);
  };

  private render() {
    if (!this.canvas) return;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.sceneManager.render(this.canvas, ctx);
  }
}

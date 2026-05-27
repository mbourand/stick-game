import type { ComponentType } from "react";
import type { Engine } from "../engine/Engine";
import type { TickContext } from "../engine/TickContext";
import type { ButtonAction } from "../input/actions";
import type { InputSystem } from "../input/InputSystem";
import type { SceneManager } from "./SceneManager";

export type SceneUIComponent = ComponentType<{ scene: Scene }>;

type SceneState = "inactive" | "active";

type ExitListener = () => void;

export abstract class Scene {
  protected engine: Engine;

  private state: SceneState = "inactive";
  private activeDisposers: (() => void)[] = [];

  private exiting = false;
  private exitPromise: Promise<void> | null = null;
  private exitResolve: (() => void) | null = null;
  private exitListeners = new Set<ExitListener>();

  constructor(engine: Engine) {
    this.engine = engine;
  }

  protected get sceneManager(): SceneManager {
    return this.engine.getSceneManager();
  }

  protected get inputSystem(): InputSystem {
    return this.engine.getInputSystem();
  }

  public abstract readonly id: string;

  public readonly UI: SceneUIComponent | null = null;

  /** When false, the scene's render() is skipped while another scene is on top of it. */
  public readonly rendersWhenInactive: boolean = false;

  public update(_tick: TickContext): void {}
  public render(_canvas: HTMLCanvasElement, _context: CanvasRenderingContext2D): void {}

  public onEntered(): void | Promise<void> {}
  public onBeforeExit(): void | Promise<void> {}
  public onDestroy(): void | Promise<void> {}

  /**
   * Called by SceneManager.popScene before the scene is deactivated.
   * Default: returns immediately. Override and return a Promise to delay the pop
   * (e.g., to play an exit animation).
   *
   * For React-driven exit animations:
   *
   *   public override transitionOut(): Promise<void> { return this.beginExit(); }
   *
   * Then in the scene's UI, observe `isExiting()` via `subscribeExit` and call
   * `completeExit()` when the animation finishes.
   */
  public transitionOut(): Promise<void> | void {}

  /**
   * React-driven exit helper. Flips `isExiting` to true, notifies UI subscribers,
   * and returns a promise resolved by `completeExit()`.
   */
  protected beginExit(): Promise<void> {
    if (this.exitPromise) return this.exitPromise;
    this.exiting = true;
    this.notifyExit();
    this.exitPromise = new Promise<void>((resolve) => {
      this.exitResolve = resolve;
    });
    return this.exitPromise;
  }

  /** Called by the scene's UI when its exit animation finishes. */
  public completeExit = (): void => {
    const resolve = this.exitResolve;
    this.exitResolve = null;
    resolve?.();
  };

  public isExiting = (): boolean => this.exiting;

  public subscribeExit = (listener: ExitListener): (() => void) => {
    this.exitListeners.add(listener);
    return () => {
      this.exitListeners.delete(listener);
    };
  };

  private notifyExit() {
    for (const listener of this.exitListeners) listener();
  }

  public isActive(): boolean {
    return this.state === "active";
  }

  /** Called by SceneManager. Do not call directly. */
  public activate(): void {
    if (this.state === "active") return;
    this.state = "active";
    void this.onEntered();
  }

  /** Called by SceneManager. Do not call directly. */
  public deactivate(): void {
    if (this.state === "inactive") return;
    this.state = "inactive";
    for (const dispose of this.activeDisposers) dispose();
    this.activeDisposers = [];
    void this.onBeforeExit();
  }

  protected onAction(action: ButtonAction, handler: () => void): void {
    const off = this.inputSystem.onActionDown(action, handler);
    this.activeDisposers.push(off);
  }

  protected onActionUp(action: ButtonAction, handler: () => void): void {
    const off = this.inputSystem.onActionUp(action, handler);
    this.activeDisposers.push(off);
  }

  protected getStick(side: "left" | "right"): { x: number; y: number } {
    return this.inputSystem.getStick(side);
  }

  public remove() {
    this.sceneManager.removeScene(this);
  }
}

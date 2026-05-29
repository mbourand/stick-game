import type { ComponentType } from "react";
import type { Engine } from "../engine/Engine";
import type { Playable } from "../engine/animation/Playable";
import type { TickContext } from "../engine/TickContext";
import type { ButtonAction } from "../input/actions";
import type { InputSystem } from "../input/InputSystem";
import type { SceneManager } from "./SceneManager";

export type SceneUIComponent<TScene extends Scene = Scene> = ComponentType<{ scene: TScene }>;

/**
 * The single lifecycle state for a scene. Drives both visible behavior
 * (rendered? updated?) and side effects (input handlers armed? onEntered
 * fired?). Every transition between phases is a `setPhase(...)` call —
 * there is no separate active/inactive flag.
 *
 *   - inactive: not on screen, no input, no per-frame work expected.
 *   - entering: appearing as a transition's `to`. Rendered + updated but
 *               not yet "active" — input handlers aren't armed, onEntered
 *               hasn't fired.
 *   - active:   normal at-rest state. Input handlers live, onEntered has
 *               fired.
 *   - exiting:  disappearing — either as a transition's `from` or as a
 *               popped scene waiting on its own exit animation. Input
 *               handlers have been torn down, onBeforeExit has fired.
 *
 * Side effects fire when crossing the `active` boundary:
 *
 *   * → active:  onEntered() is called.
 *   active → *:  registered input disposers are torn down, then
 *                onBeforeExit() is called.
 *
 * Phase transitions are driven by SceneManager and (mid-timeline) by
 * transition factories via `call(() => scene.setPhase(...))`. Scene
 * subclasses should not call setPhase on themselves.
 */
export type ScenePhase = "inactive" | "entering" | "active" | "exiting";

type PhaseListener = () => void;

export abstract class Scene {
  protected engine: Engine;

  private phase: ScenePhase = "inactive";
  private phaseListeners = new Set<PhaseListener>();
  private activeDisposers: (() => void)[] = [];

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

  // `any` here is load-bearing: it sidesteps the function-arg contravariance
  // that would otherwise block subclasses from assigning a properly-typed
  // SceneUIComponent<TheirScene>. Each subclass's view is independently
  // type-checked at its own declaration via SceneUIComponent<TheirScene>.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly UI: SceneUIComponent<any> | null = null;

  /** When false, the scene's render() is skipped while another scene is on top of it. */
  public readonly rendersWhenInactive: boolean = false;

  public update(_tick: TickContext): void {}
  public render(_canvas: HTMLCanvasElement, _context: CanvasRenderingContext2D): void {}

  public onEntered(): void | Promise<void> {}
  public onBeforeExit(): void | Promise<void> {}
  public onDestroy(): void | Promise<void> {}

  /**
   * Optional canvas-side fade-out played by transition factories. Override to
   * return a Playable that fades whatever the scene draws *inside* the ring
   * (background, HUD, etc.) — the ring itself is owned by the persistent
   * root and handled separately by the transition.
   *
   * Returning `null` (the default) means the scene has no canvas content
   * worth fading and the transition can skip it.
   */
  public exitFadePlayable(_durationMs: number): Playable | null {
    return null;
  }

  public getPhase = (): ScenePhase => this.phase;

  public subscribePhase = (listener: PhaseListener): (() => void) => {
    this.phaseListeners.add(listener);
    return () => {
      this.phaseListeners.delete(listener);
    };
  };

  public isActive(): boolean {
    return this.phase === "active";
  }

  /**
   * Called by SceneManager and (mid-timeline) by transition factories. Fires
   * onEntered/onBeforeExit on the active-boundary crossings.
   */
  public setPhase(phase: ScenePhase): void {
    if (this.phase === phase) return;
    const wasActive = this.phase === "active";
    const willBeActive = phase === "active";
    this.phase = phase;

    if (wasActive && !willBeActive) {
      for (const dispose of this.activeDisposers) dispose();
      this.activeDisposers = [];
      void this.onBeforeExit();
    }
    if (willBeActive && !wasActive) {
      void this.onEntered();
    }

    for (const listener of this.phaseListeners) listener();
  }

  protected onAction(action: ButtonAction, handler: () => void): void {
    const off = this.inputSystem.onActionDown(action, handler);
    this.activeDisposers.push(off);
  }

  protected onActionUp(action: ButtonAction, handler: () => void): void {
    const off = this.inputSystem.onActionUp(action, handler);
    this.activeDisposers.push(off);
  }

  /**
   * Press-with-repeat: handler fires once on press, then once after
   * `initialDelayMs`, then every `repeatIntervalMs` until release. Used for
   * UI list navigation (d-pad up/down) where a single tap moves one item
   * and a held press passes through items at the repeat rate.
   *
   * Tied to the active lifetime — timers are cleared when the scene leaves
   * active, same as the underlying onAction subscriptions.
   */
  protected onActionRepeat(
    action: ButtonAction,
    handler: () => void,
    opts: { initialDelayMs?: number; repeatIntervalMs?: number } = {},
  ): void {
    const initialDelayMs = opts.initialDelayMs ?? 350;
    const repeatIntervalMs = opts.repeatIntervalMs ?? 60;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    let repeatTimer: ReturnType<typeof setInterval> | null = null;
    const clearTimers = () => {
      if (initialTimer !== null) {
        clearTimeout(initialTimer);
        initialTimer = null;
      }
      if (repeatTimer !== null) {
        clearInterval(repeatTimer);
        repeatTimer = null;
      }
    };
    this.onAction(action, () => {
      clearTimers();
      handler();
      initialTimer = setTimeout(() => {
        initialTimer = null;
        repeatTimer = setInterval(handler, repeatIntervalMs);
      }, initialDelayMs);
    });
    this.onActionUp(action, clearTimers);
    this.activeDisposers.push(clearTimers);
  }

  protected getStick(side: "left" | "right"): { x: number; y: number } {
    return this.inputSystem.getStick(side);
  }

  public remove() {
    this.sceneManager.removeScene(this);
  }
}

import type { ComponentType } from "react";
import type { Engine } from "../engine/Engine";
import type { TickContext } from "../engine/TickContext";
import type { ButtonAction } from "../input/actions";
import type { InputSystem } from "../input/InputSystem";
import type { SceneManager } from "./SceneManager";

export type SceneUIComponent = ComponentType<{ scene: Scene }>;

type SceneState = "inactive" | "active";

export abstract class Scene {
  protected engine: Engine;

  private state: SceneState = "inactive";
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

  public readonly UI: SceneUIComponent | null = null;

  public update(_tick: TickContext): void {}
  public render(_canvas: HTMLCanvasElement, _context: CanvasRenderingContext2D): void {}

  public onEntered(): void | Promise<void> {}
  public onBeforeExit(): void | Promise<void> {}
  public onDestroy(): void | Promise<void> {}

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

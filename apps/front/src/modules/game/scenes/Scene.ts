import type { ComponentType } from "react";
import type { Gamepad } from "../../gamepad/Gamepad";
import type { SceneManager } from "./SceneManager";

export type SceneUIComponent = ComponentType<{ scene: Scene }>;

export abstract class Scene {
  protected sceneManager: SceneManager;
  protected gamepad: Gamepad;

  constructor(sceneManager: SceneManager, gamepad: Gamepad) {
    this.sceneManager = sceneManager;
    this.gamepad = gamepad;
  }

  public abstract readonly id: string;

  public readonly UI: SceneUIComponent | null = null;

  public update(_deltaTime: number): void {}
  public render(_canvas: HTMLCanvasElement, _context: CanvasRenderingContext2D): void {}

  public onEntered(): void | Promise<void> {}
  public onBeforeExit(): void | Promise<void> {}
  public onDestroy(): void | Promise<void> {}

  public remove() {
    this.sceneManager.removeScene(this);
  }
}

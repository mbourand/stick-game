import type { ComponentType } from "react";
import type { SceneManager } from "./SceneManager";

export type SceneUIComponent = ComponentType<{ scene: Scene }>;

export abstract class Scene {
  protected sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
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

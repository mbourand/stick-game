import type { SceneManager } from "./SceneManager";
import type { ViewModel } from "./ViewModel";

export abstract class Scene {
  protected sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  public abstract update(deltaTime: number): void;
  public abstract render(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void;
  public abstract getViewModel(): ViewModel | null;
  public abstract onEntered(): void | Promise<void>;
  public abstract onBeforeExit(): void | Promise<void>;
}

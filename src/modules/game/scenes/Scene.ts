import type { SceneManager } from "./SceneManager";

export abstract class Scene {
  protected sceneManager: SceneManager;

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
  }

  public goToScene(scene: Scene): void {
    this.sceneManager.goToScene(this, scene);
  }

  public abstract update(deltaTime: number): void;
  public abstract render(canvas: HTMLCanvasElement, context: CanvasRenderingContext2D): void;
  public abstract onEntered(): void | Promise<void>;
  public abstract onBeforeExit(): void | Promise<void>;
}

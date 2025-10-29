import type { Scene } from "./Scene";

export class SceneManager {
  private sceneStack: Scene[] = [];

  public pushScene(scene: Scene) {
    if (this.sceneStack.length > 0) this.sceneStack[this.sceneStack.length - 1].onBeforeExit();
    this.sceneStack.push(scene);
    this.sceneStack[this.sceneStack.length - 1].onEntered();
  }

  public goToScene(fromScene: Scene, toScene: Scene) {
    if (fromScene !== this.sceneStack[this.sceneStack.length - 1]) return;

    this.sceneStack[this.sceneStack.length - 1].onBeforeExit();
    this.sceneStack.pop();
    this.sceneStack.push(toScene);
    this.sceneStack[this.sceneStack.length - 1].onEntered();
  }

  public popScene() {
    if (this.sceneStack.length === 0) return;
    this.sceneStack[this.sceneStack.length - 1].onBeforeExit();
    this.sceneStack.pop();

    if (this.sceneStack.length === 0) return;
    this.sceneStack[this.sceneStack.length - 1].onEntered();
  }

  public update(deltaTime: number) {
    if (this.sceneStack.length === 0) return;
    this.sceneStack[this.sceneStack.length - 1].update(deltaTime);
  }

  public render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    for (const scene of this.sceneStack) {
      scene.render(canvas, ctx);
    }
  }

  public clearScenes() {
    while (this.sceneStack.length > 0) {
      this.popScene();
    }
  }
}

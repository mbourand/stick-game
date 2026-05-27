import type { Scene } from "./Scene";

type Listener = () => void;

export class SceneManager {
  private sceneStack: Scene[] = [];
  private listeners = new Set<Listener>();

  public subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getTopScene = (): Scene | null => {
    return this.sceneStack[this.sceneStack.length - 1] ?? null;
  };

  public getStack = (): readonly Scene[] => {
    return this.sceneStack;
  };

  public pushScene(scene: Scene) {
    void this.getTopScene()?.onBeforeExit();
    this.sceneStack.push(scene);
    void scene.onEntered();
    this.emit();
  }

  public replaceScene(scene: Scene) {
    const previous = this.sceneStack.pop();
    if (previous) {
      void previous.onBeforeExit();
      void previous.onDestroy();
    }
    this.sceneStack.push(scene);
    void scene.onEntered();
    this.emit();
  }

  public popScene() {
    const previous = this.sceneStack.pop();
    if (!previous) return;
    void previous.onBeforeExit();
    void previous.onDestroy();
    void this.getTopScene()?.onEntered();
    this.emit();
  }

  public clearScenes() {
    while (this.sceneStack.length > 0) this.popScene();
  }

  public removeScene(scene: Scene) {
    const index = this.sceneStack.indexOf(scene);
    if (index === -1) return;

    const wasTop = index === this.sceneStack.length - 1;
    if (wasTop) void scene.onBeforeExit();
    void scene.onDestroy();
    this.sceneStack.splice(index, 1);
    if (wasTop) void this.getTopScene()?.onEntered();
    this.emit();
  }

  public update(deltaTime: number) {
    this.getTopScene()?.update(deltaTime);
  }

  public render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    for (const scene of this.sceneStack) {
      scene.render(canvas, ctx);
    }
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

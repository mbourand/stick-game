import type { TickContext } from "../engine/TickContext";
import type { Scene } from "./Scene";

type Listener = () => void;

export class SceneManager {
  private sceneStack: Scene[] = [];
  private listeners = new Set<Listener>();
  private isTransitioning = false;

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
    if (this.isTransitioning) return;
    this.getTopScene()?.deactivate();
    this.sceneStack.push(scene);
    scene.activate();
    this.emit();
  }

  public replaceScene(scene: Scene) {
    if (this.isTransitioning) return;
    const previous = this.sceneStack.pop();
    if (previous) {
      previous.deactivate();
      void previous.onDestroy();
    }
    this.sceneStack.push(scene);
    scene.activate();
    this.emit();
  }

  public async popScene(): Promise<void> {
    if (this.isTransitioning) return;
    const top = this.getTopScene();
    if (!top) return;
    this.isTransitioning = true;
    try {
      await top.transitionOut();
      this.sceneStack.pop();
      top.deactivate();
      void top.onDestroy();
      this.getTopScene()?.activate();
      this.emit();
    } finally {
      this.isTransitioning = false;
    }
  }

  public clearScenes() {
    const top = this.getTopScene();
    if (top) top.deactivate();
    for (let i = this.sceneStack.length - 1; i >= 0; i--) {
      void this.sceneStack[i].onDestroy();
    }
    this.sceneStack = [];
    this.emit();
  }

  public removeScene(scene: Scene) {
    const index = this.sceneStack.indexOf(scene);
    if (index === -1) return;

    const wasTop = index === this.sceneStack.length - 1;
    if (wasTop) scene.deactivate();
    void scene.onDestroy();
    this.sceneStack.splice(index, 1);
    if (wasTop) this.getTopScene()?.activate();
    this.emit();
  }

  public update(tick: TickContext) {
    this.getTopScene()?.update(tick);
  }

  public render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const topIndex = this.sceneStack.length - 1;
    for (let i = 0; i < this.sceneStack.length; i++) {
      const scene = this.sceneStack[i];
      if (i !== topIndex && !scene.rendersWhenInactive) continue;
      scene.render(canvas, ctx);
    }
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

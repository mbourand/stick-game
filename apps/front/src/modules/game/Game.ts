import { BeatmapSelectionModel } from "./scenes/BeatmapSelection/BeatmapSelectionModel";
import { SceneManager } from "./scenes/SceneManager";

export class Game {
  private lastFrameTime: number;
  private started: boolean;

  private canvas: HTMLCanvasElement | null = null;

  private afterTick: () => void;

  private sceneManager = new SceneManager();

  constructor(afterTick: () => void) {
    this.started = false;
    this.lastFrameTime = 0;
    this.afterTick = afterTick;
  }

  public async start(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.started = true;
    this.lastFrameTime = performance.now();
    this.sceneManager.pushScene(new BeatmapSelectionModel(this.sceneManager));
  }

  public tick() {
    if (!this.started) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.update(deltaTime);
    this.afterTick();
  }

  private update(deltaTime: number) {
    if (!this.canvas || !this.started) return;

    this.sceneManager.update(deltaTime);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.sceneManager.render(this.canvas, ctx);
  }

  public getUI() {
    return this.sceneManager.getViewsComponents();
  }
}

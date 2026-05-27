import { Gamepad } from "../gamepad/Gamepad";
import { FrameDriver } from "./frame/FrameDriver";
import { MainMenuScene } from "./scenes/MainMenu/MainMenuScene";
import { SceneManager } from "./scenes/SceneManager";

export class Game {
  private lastFrameTime: number;
  private started: boolean;

  private canvas: HTMLCanvasElement | null = null;

  private afterTick: () => void;

  private sceneManager = new SceneManager();
  private frameDriver = new FrameDriver();
  private gamepad = new Gamepad();

  constructor(afterTick: () => void) {
    this.started = false;
    this.lastFrameTime = 0;
    this.afterTick = afterTick;
  }

  public async start(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.started = true;
    this.lastFrameTime = performance.now();
    this.sceneManager.pushScene(new MainMenuScene(this.sceneManager, this.gamepad));
  }

  public destroy() {
    this.started = false;
    this.gamepad.destroy();
  }

  public tick() {
    if (!this.started) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    this.update(deltaTime);
    this.afterTick();
  }

  public getSceneManager() {
    return this.sceneManager;
  }

  public getFrameDriver() {
    return this.frameDriver;
  }

  public getGamepad() {
    return this.gamepad;
  }

  private update(deltaTime: number) {
    if (!this.canvas || !this.started) return;

    this.gamepad.tick();
    this.sceneManager.update(deltaTime);
    this.frameDriver.tick(deltaTime, this.lastFrameTime);

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.sceneManager.render(this.canvas, ctx);
  }
}

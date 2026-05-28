import type { Entity } from "./Entity";
import type { TickContext } from "./TickContext";

export type ContainerOptions = {
  x?: number;
  y?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  filter?: string | null;
  alpha?: number;
};

export class Container implements Entity {
  public x: number;
  public y: number;
  public rotation: number;
  public scaleX: number;
  public scaleY: number;

  public filter: string | null;
  public alpha: number;

  private children: Entity[] = [];

  private offscreen: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  constructor(opts: ContainerOptions = {}) {
    this.x = opts.x ?? 0;
    this.y = opts.y ?? 0;
    this.rotation = opts.rotation ?? 0;
    this.scaleX = opts.scaleX ?? 1;
    this.scaleY = opts.scaleY ?? 1;
    this.filter = opts.filter ?? null;
    this.alpha = opts.alpha ?? 1;
  }

  public add<T extends Entity>(child: T): T {
    this.children.push(child);
    return child;
  }

  public addAt<T extends Entity>(child: T, index: number): T {
    this.children.splice(Math.max(0, Math.min(index, this.children.length)), 0, child);
    return child;
  }

  public remove(child: Entity): boolean {
    const index = this.children.indexOf(child);
    if (index === -1) return false;
    this.children.splice(index, 1);
    child.destroy?.();
    return true;
  }

  /**
   * Remove a child without destroying it. Use for entities owned elsewhere
   * (e.g., a persistent layer that several scenes reference) — destroying it
   * would kill state shared across scenes.
   */
  public detach(child: Entity): boolean {
    const index = this.children.indexOf(child);
    if (index === -1) return false;
    this.children.splice(index, 1);
    return true;
  }

  public clear(): void {
    for (const child of this.children) child.destroy?.();
    this.children = [];
  }

  public update(tick: TickContext): void {
    const len = this.children.length;
    for (let i = len - 1; i >= 0; i--) {
      const child = this.children[i];
      child.update(tick);
      if (child.isAlive?.() === false) {
        child.destroy?.();
        this.children.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    const composited = this.filter !== null || this.alpha !== 1;

    if (!composited) {
      ctx.save();
      this.applyTransform(ctx);
      for (const child of this.children) child.render(ctx);
      ctx.restore();
      return;
    }

    const offCtx = this.ensureOffscreen(ctx.canvas.width, ctx.canvas.height);
    const parentTransform = ctx.getTransform();

    offCtx.setTransform(1, 0, 0, 1, 0, 0);
    offCtx.clearRect(0, 0, offCtx.canvas.width, offCtx.canvas.height);
    offCtx.setTransform(parentTransform);
    this.applyTransform(offCtx);
    for (const child of this.children) child.render(offCtx);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.filter !== null) ctx.filter = this.filter;
    ctx.globalAlpha *= this.alpha;
    ctx.drawImage(offCtx.canvas, 0, 0);
    ctx.restore();
  }

  public destroy(): void {
    this.clear();
    this.offscreen = null;
    this.offscreenCtx = null;
  }

  private applyTransform(ctx: CanvasRenderingContext2D) {
    if (this.x !== 0 || this.y !== 0) ctx.translate(this.x, this.y);
    if (this.rotation !== 0) ctx.rotate(this.rotation);
    if (this.scaleX !== 1 || this.scaleY !== 1) ctx.scale(this.scaleX, this.scaleY);
  }

  private ensureOffscreen(width: number, height: number): CanvasRenderingContext2D {
    if (!this.offscreen) {
      this.offscreen = document.createElement("canvas");
    }
    if (this.offscreen.width !== width || this.offscreen.height !== height) {
      this.offscreen.width = width;
      this.offscreen.height = height;
      this.offscreenCtx = this.offscreen.getContext("2d");
    }
    if (!this.offscreenCtx) {
      this.offscreenCtx = this.offscreen.getContext("2d");
    }
    if (!this.offscreenCtx) throw new Error("Could not get offscreen 2d context");
    return this.offscreenCtx;
  }
}

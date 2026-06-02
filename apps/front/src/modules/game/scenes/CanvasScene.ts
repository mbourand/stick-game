import { Container } from "../engine/Container";
import type { TickContext } from "../engine/TickContext";
import { sharedCircle } from "../sharedCircle";
import { Scene } from "./Scene";

/**
 * Scene whose canvas content is composed inside a Container positioned at the
 * canvas centre every frame. Subclasses add their entities to `root`; this
 * base class wires update/render/destroy.
 *
 * The shared persistent ring is auto-detached on destroy if it's part of
 * the tree, so it survives across scene swaps. Subclasses that override
 * `onDestroy` should call `super.onDestroy()` (or destroy `root` themselves).
 */
export abstract class CanvasScene extends Scene {
  protected readonly root = new Container();

  public override update(tick: TickContext): void {
    this.root.update(tick);
  }

  public override render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    // Centre the design-space content in the (device-pixel) backing store and
    // fold in dpr * design→screen scale, so everything is authored in design px
    // yet rendered crisply and fitted to the viewport. The DOM overlay applies
    // the same `scale` around the viewport centre to stay pixel-locked.
    const { dpr, scale } = this.engine.viewport.get();
    this.root.x = canvas.width / 2;
    this.root.y = canvas.height / 2;
    this.root.scaleX = dpr * scale;
    this.root.scaleY = dpr * scale;
    this.root.render(ctx);
  }

  public override onDestroy(): void | Promise<void> {
    this.root.detach(sharedCircle(this.engine));
    this.root.destroy();
  }
}

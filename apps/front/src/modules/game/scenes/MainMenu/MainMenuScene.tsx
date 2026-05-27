import type { TickContext } from "../../engine/TickContext";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../utils/constants";
import { BeatmapSelectionScene } from "../BeatmapSelection/BeatmapSelectionScene";
import { Scene } from "../Scene";
import { BUTTON_HEIGHT_PX, BUTTONS, getButtonYOffsetFromCenter, type ButtonId } from "./layout";
import { MainMenuView } from "./MainMenuView";

const STICK_EDGE_THRESHOLD = 0.9;

type Listener = () => void;

export class MainMenuScene extends Scene {
  public readonly id = "main-menu";
  public override readonly UI = MainMenuView;

  private focusedId: ButtonId | null = null;
  private listeners = new Set<Listener>();

  public override onEntered() {
    this.onAction("confirm", () => {
      if (this.focusedId !== null) this.activateFocused(this.focusedId);
    });
  }

  public subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getFocused = (): ButtonId | null => this.focusedId;

  public setFocused(id: ButtonId | null) {
    if (this.focusedId === id) return;
    this.focusedId = id;
    this.notify();
  }

  public activateFocused(id: ButtonId) {
    if (id === "play") this.goToBeatmapSelection();
    else if (id === "settings") this.openSettings();
  }

  public goToBeatmapSelection() {
    this.sceneManager.pushScene(new BeatmapSelectionScene(this.engine));
  }

  public openSettings() {
    // Settings submenu wiring comes next iteration.
  }

  public override update(_tick: TickContext) {
    const leftStick = this.getStick("left");
    const rightStick = this.getStick("right");

    const target = this.buttonAimedByStick(leftStick) ?? this.buttonAimedByStick(rightStick);
    if (target !== null) this.setFocused(target);
  }

  public override render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const leftStick = this.getStick("left");
    const rightStick = this.getStick("right");

    this.drawStick(ctx, centerX, centerY, leftStick, "rgba(255, 0, 0, 0.5)", "red");
    this.drawStick(ctx, centerX, centerY, rightStick, "rgba(0, 0, 255, 0.5)", "blue");
  }

  private drawStick(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    stick: { x: number; y: number },
    lineColor: string,
    dotColor: string,
  ) {
    const tipX = centerX + stick.x * GAME_CIRCLE_DISPLAYED_RADIUS;
    const tipY = centerY + stick.y * GAME_CIRCLE_DISPLAYED_RADIUS;

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(tipX, tipY, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  private buttonAimedByStick(stick: { x: number; y: number }): ButtonId | null {
    const magnitude = Math.sqrt(stick.x * stick.x + stick.y * stick.y);
    if (magnitude < STICK_EDGE_THRESHOLD) return null;
    if (stick.x <= 0) return null;

    const projectedY = stick.y * GAME_CIRCLE_DISPLAYED_RADIUS;

    for (let i = 0; i < BUTTONS.length; i++) {
      const yOffset = getButtonYOffsetFromCenter(i);
      if (Math.abs(projectedY - yOffset) <= BUTTON_HEIGHT_PX / 2) {
        return BUTTONS[i].id;
      }
    }
    return null;
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }
}

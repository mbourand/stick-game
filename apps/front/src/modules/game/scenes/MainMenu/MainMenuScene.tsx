import { StickDotsEntity } from "../../entities/StickDotsEntity";
import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import type { TickContext } from "../../engine/TickContext";
import { mainMenuToBeatmapSelection } from "../../engine/transitions/factories/mainMenuToBeatmapSelection";
import { GAME_CIRCLE_DISPLAYED_RADIUS } from "../../utils/constants";
import { BeatmapSelectionScene } from "../BeatmapSelection/BeatmapSelectionScene";
import { CanvasScene } from "../CanvasScene";
import { BUTTON_HEIGHT_PX, BUTTONS, getButtonYOffsetFromCenter, type ButtonId } from "./layout";
import { MainMenuView } from "./MainMenuView";

const STICK_EDGE_THRESHOLD = 0.9;

export class MainMenuScene extends CanvasScene {
  public readonly id = "main-menu";
  public override readonly UI = MainMenuView;

  public readonly focused = new Store<ButtonId | null>(null);

  constructor(engine: Engine) {
    super(engine);
    this.root.add(engine.circle);
    this.root.add(new StickDotsEntity(this.inputSystem, engine.circle));
  }

  public override onEntered() {
    this.onAction("confirm", () => {
      const id = this.focused.get();
      if (id !== null) this.activateFocused(id);
    });
    this.onActionRepeat("nav-up", () => this.moveFocus(-1));
    this.onActionRepeat("nav-down", () => this.moveFocus(+1));
  }

  private moveFocus(delta: -1 | 1): void {
    const current = this.focused.get();
    if (current === null) {
      this.focused.set(BUTTONS[0].id);
      return;
    }
    const idx = BUTTONS.findIndex((b) => b.id === current);
    const next = Math.max(0, Math.min(BUTTONS.length - 1, idx + delta));
    if (next !== idx) this.focused.set(BUTTONS[next].id);
  }

  public activateFocused(id: ButtonId) {
    if (id === "play") this.goToBeatmapSelection();
    else if (id === "settings") this.openSettings();
  }

  public goToBeatmapSelection() {
    void this.sceneManager.transitionPush(
      new BeatmapSelectionScene(this.engine),
      mainMenuToBeatmapSelection,
    );
  }

  public openSettings() {
    // Settings submenu wiring comes next iteration.
  }

  public override update(tick: TickContext) {
    const leftStick = this.getStick("left");
    const rightStick = this.getStick("right");

    const target = this.buttonAimedByStick(leftStick) ?? this.buttonAimedByStick(rightStick);
    if (target !== null) this.focused.set(target);

    super.update(tick);
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
}

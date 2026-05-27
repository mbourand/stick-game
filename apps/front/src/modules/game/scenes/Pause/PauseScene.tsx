import { Scene } from "../Scene";
import { PauseView } from "./PauseView";

export class PauseScene extends Scene {
  public readonly id = "pause";
  public override readonly UI = PauseView;

  public override onEntered() {
    this.onAction("pause", () => this.sceneManager.popScene());
    this.onAction("back", () => this.sceneManager.popScene());
  }

  public override transitionOut(): Promise<void> {
    return this.beginExit();
  }
}

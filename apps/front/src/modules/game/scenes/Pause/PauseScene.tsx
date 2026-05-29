import { pauseExit } from "../../engine/transitions/factories/pauseExit";
import { Scene } from "../Scene";
import { PauseView } from "./PauseView";

export class PauseScene extends Scene {
  public readonly id = "pause";
  public override readonly UI = PauseView;

  public override onEntered() {
    this.onAction("pause", () => void this.sceneManager.transitionPop(pauseExit));
    this.onAction("back", () => void this.sceneManager.transitionPop(pauseExit));
  }
}

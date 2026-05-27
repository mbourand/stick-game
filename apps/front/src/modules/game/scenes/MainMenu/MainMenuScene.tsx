import { BeatmapSelectionScene } from "../BeatmapSelection/BeatmapSelectionScene";
import { Scene } from "../Scene";
import { MainMenuView } from "./MainMenuView";

export class MainMenuScene extends Scene {
  public readonly id = "main-menu";
  public override readonly UI = MainMenuView;

  public goToBeatmapSelection() {
    this.sceneManager.pushScene(new BeatmapSelectionScene(this.sceneManager));
  }

  public openSettings() {
    // Settings submenu wiring comes next iteration.
  }
}

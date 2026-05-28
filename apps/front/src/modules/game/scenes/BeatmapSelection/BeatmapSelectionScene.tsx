import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { beatmapSelectionToGameplay } from "../../engine/transitions/factories/beatmapSelectionToGameplay";
import { beatmapSelectionToMainMenu } from "../../engine/transitions/factories/beatmapSelectionToMainMenu";
import { GameplayScene } from "../Gameplay/GameplayScene";
import { Scene } from "../Scene";
import { BeatmapSelectionView } from "./BeatmapSelectionView";

export class BeatmapSelectionScene extends Scene {
  public readonly id = "beatmap-selection";
  public override readonly UI = BeatmapSelectionView;

  private lastGameplayScene: GameplayScene | null = null;

  public override onEntered() {
    this.onAction("back", () => this.goBack());
  }

  public playMap(selectedMap: ParsedMap) {
    this.lastGameplayScene?.remove();
    const gameplayScene = new GameplayScene(this.engine, selectedMap);
    void this.sceneManager.transitionPush(gameplayScene, beatmapSelectionToGameplay);
    this.lastGameplayScene = gameplayScene;
  }

  public goBack() {
    void this.sceneManager.transitionPop(beatmapSelectionToMainMenu);
  }
}

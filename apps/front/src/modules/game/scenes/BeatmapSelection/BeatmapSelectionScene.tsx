import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { GameplayScene } from "../Gameplay/GameplayScene";
import { Scene } from "../Scene";
import { BeatmapSelectionView } from "./BeatmapSelectionView";

export class BeatmapSelectionScene extends Scene {
  public readonly id = "beatmap-selection";
  public override readonly UI = BeatmapSelectionView;

  private lastGameplayScene: GameplayScene | null = null;

  public playMap(selectedMap: ParsedMap) {
    this.lastGameplayScene?.remove();
    const gameplayScene = new GameplayScene(this.sceneManager, this.gamepad, selectedMap);
    this.sceneManager.pushScene(gameplayScene);
    this.lastGameplayScene = gameplayScene;
  }
}

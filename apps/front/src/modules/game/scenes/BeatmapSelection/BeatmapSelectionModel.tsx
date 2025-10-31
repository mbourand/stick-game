import { BeatmapSelectionViewModel } from "@/modules/game/scenes/BeatmapSelection/BeatmapSelectionViewModel";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { GameplayScene } from "../Gameplay/GameplayScene";
import { Scene } from "../Scene";
import { SceneManager } from "@/modules/game/scenes/SceneManager";

export class BeatmapSelectionModel extends Scene {
  private viewModel: BeatmapSelectionViewModel;

  constructor(sceneManager: SceneManager) {
    super(sceneManager);
    this.viewModel = new BeatmapSelectionViewModel(this);
  }

  public onEntered(): void | Promise<void> {
    return;
  }
  public onBeforeExit(): void | Promise<void> {
    return;
  }

  public update(_deltaTime: number): void {
    return;
  }

  public render(_canvas: HTMLCanvasElement, _context: CanvasRenderingContext2D): void {
    return;
  }

  public playMap(selectedMap: ParsedMap) {
    this.sceneManager.goToScene(new GameplayScene(this.sceneManager, selectedMap));
  }

  public getViewModel() {
    return this.viewModel;
  }
}

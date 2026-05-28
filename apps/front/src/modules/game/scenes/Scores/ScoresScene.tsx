import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import type { Engine } from "../../engine/Engine";
import type { ScoreCounter } from "../../score/ScoreCounter";
import { GameplayScene } from "../Gameplay/GameplayScene";
import { Scene } from "../Scene";
import { ScoresView } from "./ScoresView";
import { scoresToBeatmapSelection } from "../../engine/transitions/factories/scoresToBeatmapSelection";
import { scoresToGameplay } from "../../engine/transitions/factories/scoresToGameplay";

export class ScoresScene extends Scene {
  public readonly id = "scores";
  public override readonly UI = ScoresView;

  public readonly parsedMap: ParsedMap;
  public readonly scoreCounter: ScoreCounter;

  constructor(engine: Engine, parsedMap: ParsedMap, scoreCounter: ScoreCounter) {
    super(engine);
    this.parsedMap = parsedMap;
    this.scoreCounter = scoreCounter;
  }

  public override onEntered() {
    this.onAction("confirm", () => this.retry());
    this.onAction("back", () => this.backToSelection());
  }

  public retry(): void {
    const next = new GameplayScene(this.engine, this.parsedMap);
    void this.sceneManager.transitionReplace(next, scoresToGameplay);
  }

  public backToSelection(): void {
    void this.sceneManager.transitionPop(scoresToBeatmapSelection);
  }
}

import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import type { Engine } from "../../engine/Engine";
import type { ScoreCounter } from "../../score/ScoreCounter";
import { BEATMAP_AUDIO_ID, GameplayScene } from "../Gameplay/GameplayScene";
import { CanvasScene } from "../CanvasScene";
import { ScoresView } from "./ScoresView";
import { scoresToBeatmapSelection } from "../../engine/transitions/factories/scoresToBeatmapSelection";
import { scoresToGameplay } from "../../engine/transitions/factories/scoresToGameplay";

const MUSIC_FADE_OUT_MS = 500;

export class ScoresScene extends CanvasScene {
  public readonly id = "scores";
  public override readonly UI = ScoresView;

  public readonly parsedMap: ParsedMap;
  public readonly scoreCounter: ScoreCounter;

  constructor(engine: Engine, parsedMap: ParsedMap, scoreCounter: ScoreCounter) {
    super(engine);
    this.parsedMap = parsedMap;
    this.scoreCounter = scoreCounter;
    this.root.add(engine.circle);
  }

  public override onEntered() {
    this.onAction("confirm", () => this.retry());
    this.onAction("back", () => this.backToSelection());
  }

  public override onBeforeExit() {
    // Music was handed off from gameplay — fade it out as we leave so the
    // exit doesn't feel like an abrupt cut. The fade is shorter than the
    // outgoing transition + buffer-load time on the next scene, so the
    // source is fully gone before any new audio takes the channel.
    this.engine.audio.music.fadeOut(BEATMAP_AUDIO_ID, MUSIC_FADE_OUT_MS);
  }

  public retry(): void {
    const next = new GameplayScene(this.engine, this.parsedMap);
    void this.sceneManager.transitionReplace(next, scoresToGameplay);
  }

  public backToSelection(): void {
    void this.sceneManager.transitionPop(scoresToBeatmapSelection);
  }
}

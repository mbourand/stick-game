import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { Container } from "../../engine/Container";
import type { Engine } from "../../engine/Engine";
import type { CircleLayer } from "../../entities/CircleLayer";
import type { TickContext } from "../../engine/TickContext";
import type { ScoreCounter } from "../../score/ScoreCounter";
import { BEATMAP_AUDIO_ID, GameplayScene } from "../Gameplay/GameplayScene";
import { Scene } from "../Scene";
import { ScoresView } from "./ScoresView";
import { scoresToBeatmapSelection } from "../../engine/transitions/factories/scoresToBeatmapSelection";
import { scoresToGameplay } from "../../engine/transitions/factories/scoresToGameplay";

const MUSIC_FADE_OUT_MS = 500;

export class ScoresScene extends Scene {
  public readonly id = "scores";
  public override readonly UI = ScoresView;

  public readonly parsedMap: ParsedMap;
  public readonly scoreCounter: ScoreCounter;

  private root = new Container();
  private circle: CircleLayer;

  constructor(engine: Engine, parsedMap: ParsedMap, scoreCounter: ScoreCounter) {
    super(engine);
    this.parsedMap = parsedMap;
    this.scoreCounter = scoreCounter;
    this.circle = engine.circle;
    this.root.add(this.circle);
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

  public override onDestroy() {
    this.root.detach(this.circle);
    this.root.destroy();
  }

  public override update(tick: TickContext): void {
    this.root.update(tick);
  }

  public override render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    this.root.x = canvas.width / 2;
    this.root.y = canvas.height / 2;
    this.root.render(ctx);
  }

  public retry(): void {
    const next = new GameplayScene(this.engine, this.parsedMap);
    void this.sceneManager.transitionReplace(next, scoresToGameplay);
  }

  public backToSelection(): void {
    void this.sceneManager.transitionPop(scoresToBeatmapSelection);
  }
}

import type { Engine } from "../../engine/Engine";
import type { TransitionFactory } from "../../engine/transitions/TransitionContext";
import { Store } from "../../engine/state/Store";
import { Scene } from "../Scene";
import { cyclePlayerRankingMetric, PLAYER_RANKING_METRICS, type PlayerRankingMetric } from "./metrics";
import { PlayerRankingsView } from "./PlayerRankingsView";

/**
 * Global player-ranking boards (most SSS / full combos / SS+ / plays). A DOM-only
 * scene like Profile: the React view renders the boards, the scene owns the
 * selected metric, the bumpers/d-pad cycle between boards, and B closes.
 */
export class PlayerRankingsScene extends Scene {
  public readonly id = "player-rankings";
  public override readonly UI = PlayerRankingsView;

  /** Which board is shown; cycled by the bumpers and left/right. */
  public readonly metric = new Store<PlayerRankingMetric>("sss");

  /**
   * Sign of the most recent board change (+1 = moved right, -1 = left). Read at
   * animation time by the view so the outgoing/incoming boards slide the right
   * way — same trick as ScoresScene.tabDirection.
   */
  public tabDirection: -1 | 1 = 1;

  private readonly exitFactory: TransitionFactory;

  constructor(engine: Engine, exitFactory: TransitionFactory) {
    super(engine);
    this.exitFactory = exitFactory;
  }

  public override onEntered() {
    this.onAction("back", () => this.close());
    this.onAction("leaderboard-prev", () => this.cycleMetric(-1));
    this.onAction("leaderboard-next", () => this.cycleMetric(1));
    this.onAction("nav-left", () => this.cycleMetric(-1));
    this.onAction("nav-right", () => this.cycleMetric(1));
  }

  public cycleMetric(dir: -1 | 1): void {
    this.tabDirection = dir;
    this.metric.set(cyclePlayerRankingMetric(this.metric.get(), dir));
  }

  /** Jump straight to a board (clicked tab); direction inferred from the index delta. */
  public setMetric(next: PlayerRankingMetric): void {
    const current = this.metric.get();
    if (next === current) return;
    this.tabDirection = PLAYER_RANKING_METRICS.indexOf(next) > PLAYER_RANKING_METRICS.indexOf(current) ? 1 : -1;
    this.metric.set(next);
  }

  public close() {
    void this.sceneManager.transitionPop(this.exitFactory);
  }
}

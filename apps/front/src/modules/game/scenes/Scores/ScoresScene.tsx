import { browserQueryClient } from "@/components/QueryProvider";
import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";
import { submitScore } from "@/modules/score/submit-score";
import type { LeaderboardTab } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { easeInOutCubic } from "../../engine/animation/Easing";
import type { Playable } from "../../engine/animation/Playable";
import { tween } from "../../engine/animation/Tween";
import { Container } from "../../engine/Container";
import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import { BackgroundEntity } from "../../entities/BackgroundEntity";
import { JudgmentKind } from "../../judge/constants";
import type { ScoreCounter } from "../../score/ScoreCounter";
import { sharedCircle } from "../../sharedCircle";
import { SCORES_CIRCLE_RADIUS } from "../../utils/constants";
import { BEATMAP_AUDIO_ID, GameplayScene } from "../Gameplay/GameplayScene";
import { CanvasScene } from "../CanvasScene";
import type { SceneTransitionSlot } from "../Scene";
import { ScoresView } from "./ScoresView";
import { scoresToBeatmapSelection } from "../../engine/transitions/factories/scoresToBeatmapSelection";
import { scoresToGameplay } from "../../engine/transitions/factories/scoresToGameplay";

const MUSIC_FADE_OUT_MS = 500;

export type ScoresTab = "overview" | "graph" | "rank";
const TAB_ORDER: readonly ScoresTab[] = ["overview", "graph", "rank"];

/**
 * Outcome of persisting the finished play. Drives the Rank tab: `localId`
 * pinpoints the player's own row in the local leaderboard, while the global
 * flags let the UI show a graceful "offline / unranked" state instead of an
 * error when submission didn't land.
 */
export type SubmissionState = {
  status: "saving" | "settled";
  /** Dexie row id of the saved local score, or null if the local save failed. */
  localId: number | null;
  /** Backend accepted the score onto the global leaderboard. */
  uploadedGlobal: boolean;
  /** Backend request itself failed (offline / server error). */
  globalError: boolean;
};

const INITIAL_SUBMISSION: SubmissionState = {
  status: "saving",
  localId: null,
  uploadedGlobal: false,
  globalError: false,
};

export class ScoresScene extends CanvasScene {
  public readonly id = "scores";
  public override readonly UI = ScoresView;

  public readonly parsedMap: ParsedMap;
  public readonly scoreCounter: ScoreCounter;
  public readonly playerName: string;

  public readonly activeTab = new Store<ScoresTab>("overview");
  public readonly leaderboardTab = new Store<LeaderboardTab>("global");
  public readonly submission = new Store<SubmissionState>(INITIAL_SUBMISSION);

  /**
   * Which way the last tab change went (+1 = rightward, -1 = leftward). Read by
   * the view to slide the outgoing tab out and the new one in from the right
   * direction. Set synchronously right before `activeTab` changes, so it's
   * always current in the render that change triggers.
   */
  public tabDirection: -1 | 1 = 1;

  /** Beatmap background, cropped to the scores circle. Fades out on exit. */
  private readonly background = new Container();

  constructor(engine: Engine, parsedMap: ParsedMap, scoreCounter: ScoreCounter) {
    super(engine);
    this.parsedMap = parsedMap;
    this.scoreCounter = scoreCounter;
    this.playerName = engine.settings.get().playerName;

    // Background sits behind the ring; clip to the live ring radius so it
    // doesn't spill past the ring while it grows in from gameplay. Starts
    // transparent and fades in during enter (see scenePlayable) — otherwise it
    // would render opaque over the still-visible gameplay scene from frame one.
    const circle = sharedCircle(engine);
    this.background.alpha = 0;
    this.background.add(
      new BackgroundEntity(parsedMap, engine.settings, {
        radius: SCORES_CIRCLE_RADIUS,
        clipRadius: () => circle.radius,
        variant: "menu",
      }),
    );
    this.root.add(this.background);
    this.root.add(circle);

    // Kick off persistence immediately so the network round-trip overlaps the
    // gameplay→scores transition; the Rank tab reads `submission` reactively.
    void this.submitPlayedScore();
  }

  public override scenePlayable(slot: SceneTransitionSlot, durationMs: number): Playable | null {
    // Fade the background in on enter (so gameplay stays visible while it fades
    // out underneath) and back out on exit (so leaving doesn't cut hard).
    const to = slot === "enter" ? 1 : 0;
    return tween({ target: this.background, to: { alpha: to }, duration: durationMs, easing: easeInOutCubic });
  }

  public override onEntered() {
    this.onAction("confirm", () => this.retry());
    this.onAction("back", () => this.backToSelection());
    this.onActionRepeat("nav-left", () => this.cycleTab(-1));
    this.onActionRepeat("nav-right", () => this.cycleTab(1));
    this.onStickRepeat("x", (dir) => this.cycleTab(dir));
    // Two leaderboard tabs, so either bumper just flips between them — matching
    // the beatmap-selection convention.
    this.onAction("leaderboard-prev", () => this.toggleLeaderboardTab());
    this.onAction("leaderboard-next", () => this.toggleLeaderboardTab());
  }

  public override onBeforeExit() {
    // Music was handed off from gameplay — fade it out as we leave so the
    // exit doesn't feel like an abrupt cut. The fade is shorter than the
    // outgoing transition + buffer-load time on the next scene, so the
    // source is fully gone before any new audio takes the channel.
    this.engine.audio.music.fadeOut(BEATMAP_AUDIO_ID, MUSIC_FADE_OUT_MS);
  }

  public cycleTab(dir: -1 | 1): void {
    const current = TAB_ORDER.indexOf(this.activeTab.get());
    const next = current + dir;
    // No wraparound — pressing past an edge tab is a no-op.
    if (next < 0 || next >= TAB_ORDER.length) return;
    this.tabDirection = dir;
    this.activeTab.set(TAB_ORDER[next]);
  }

  public setTab(tab: ScoresTab): void {
    const from = TAB_ORDER.indexOf(this.activeTab.get());
    const to = TAB_ORDER.indexOf(tab);
    if (to === from) return;
    this.tabDirection = to > from ? 1 : -1;
    this.activeTab.set(tab);
  }

  public toggleLeaderboardTab(): void {
    this.leaderboardTab.set(this.leaderboardTab.get() === "global" ? "local" : "global");
  }

  public retry(): void {
    const next = new GameplayScene(this.engine, this.parsedMap);
    void this.sceneManager.transitionReplace(next, scoresToGameplay);
  }

  public backToSelection(): void {
    void this.sceneManager.transitionPop(scoresToBeatmapSelection);
  }

  /**
   * Persist the finished play locally + to the global leaderboard, mirror the
   * outcome into `submission`, and invalidate the leaderboard queries so the
   * lists refetch with the new score. Fire-and-forget — failures surface as
   * graceful states in the Rank tab rather than blocking or alerting.
   */
  private async submitPlayedScore(): Promise<void> {
    const sc = this.scoreCounter;
    const { backendResult, localResult } = await submitScore({
      accuracy: sc.getAccuracy(),
      score: sc.getScore(),
      maxCombo: sc.getMaxCombo(),
      playerName: this.playerName,
      missCount: sc.getJudgmentCount(JudgmentKind.Miss),
      mehCount: sc.getJudgmentCount(JudgmentKind.Meh),
      goodCount: sc.getJudgmentCount(JudgmentKind.Good),
      greatCount: 0,
      perfectCount: sc.getJudgmentCount(JudgmentKind.Perfect),
      beatmapId: this.parsedMap.id,
    });

    const localId = localResult.status === "fulfilled" ? localResult.value : null;
    const uploadedGlobal = backendResult.status === "fulfilled" && backendResult.value.wasUploaded;
    const globalError = backendResult.status === "rejected";

    if (localResult.status === "rejected") {
      console.error("Failed to save score locally:", localResult.reason);
    }
    if (globalError) {
      console.error("Failed to submit score to backend:", backendResult.reason);
    }

    this.submission.set({ status: "settled", localId, uploadedGlobal, globalError });

    if (localId !== null) {
      browserQueryClient?.invalidateQueries({
        queryKey: localScoresBeatmapLeaderboardQueryOptions(this.parsedMap.id, LATEST_SCORE_VERSION).queryKey,
      });
    }
    if (uploadedGlobal) {
      browserQueryClient?.invalidateQueries({
        queryKey: scoresBeatmapLeaderboardQueryOptions(this.parsedMap.id, LATEST_SCORE_VERSION).queryKey,
      });
    }
  }
}

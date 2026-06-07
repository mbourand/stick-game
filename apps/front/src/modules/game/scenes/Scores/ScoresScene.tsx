import { browserQueryClient } from "@/components/QueryProvider";
import { localScoresBeatmapLeaderboardQueryOptions } from "@/modules/db/queries/local-scores-beatmap-leaderboard";
import { scoresBeatmapLeaderboardQueryOptions } from "@/modules/fetching/back/queries/scores-beatmap-leaderboard";
import { LATEST_SCORE_VERSION } from "@/modules/score/constants";
import { submitScore } from "@/modules/score/submit-score";
import { type LeaderboardTab, cycleLeaderboardTab } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import { JudgmentKind } from "../../judge/constants";
import { type ActiveMods, describeMods, isModded } from "../../mods/mods";
import type { ScoreCounter } from "../../score/ScoreCounter";
import { backgroundLayer } from "../../BackgroundLayer";
import { sharedCircle } from "../../sharedCircle";
import { SCORES_CIRCLE_RADIUS } from "../../utils/constants";
import { BEATMAP_AUDIO_ID, GameplayScene } from "../Gameplay/GameplayScene";
import { BeatmapLeaderboardScene } from "../BeatmapLeaderboard/BeatmapLeaderboardScene";
import { CanvasScene } from "../CanvasScene";
import { ScoresView } from "./ScoresView";
import { crossfade, fadeOutResizeIn, fadeResizeRevealStaged } from "../transitions";

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
  /** Whether the player was signed in — global ranking requires an account. */
  loggedIn: boolean;
};

const INITIAL_SUBMISSION: SubmissionState = {
  status: "saving",
  localId: null,
  uploadedGlobal: false,
  globalError: false,
  loggedIn: false,
};

export class ScoresScene extends CanvasScene {
  public readonly id = "scores";
  public override readonly UI = ScoresView;
  public override get ringRadius(): number {
    return SCORES_CIRCLE_RADIUS;
  }

  public readonly parsedMap: ParsedMap;
  public readonly scoreCounter: ScoreCounter;
  public readonly playerName: string;
  public readonly mods: ActiveMods;
  /** Whether this play used mods — picks the modded vs no-mods global board. */
  public readonly modded: boolean;

  public readonly activeTab = new Store<ScoresTab>("overview");
  public readonly leaderboardTab: Store<LeaderboardTab>;
  public readonly submission = new Store<SubmissionState>(INITIAL_SUBMISSION);

  /**
   * Which way the last tab change went (+1 = rightward, -1 = leftward). Read by
   * the view to slide the outgoing tab out and the new one in from the right
   * direction. Set synchronously right before `activeTab` changes, so it's
   * always current in the render that change triggers.
   */
  public tabDirection: -1 | 1 = 1;

  constructor(engine: Engine, parsedMap: ParsedMap, scoreCounter: ScoreCounter, mods: ActiveMods) {
    super(engine);
    this.parsedMap = parsedMap;
    this.scoreCounter = scoreCounter;
    this.playerName = engine.settings.get().playerName;
    this.mods = mods;
    this.modded = isModded(mods);
    // Land on the board this play belongs to, so the just-set score is in view.
    this.leaderboardTab = new Store<LeaderboardTab>(this.modded ? "modded" : "global");

    // The background is the shared persistent layer — it already shows this map
    // (carried over from gameplay), so leaving in the persistent layer means the
    // background never blinks; `onEntered` retargets it to the brighter menu
    // treatment once the screen settles. Added behind the ring.
    const circle = sharedCircle(engine);
    this.root.add(backgroundLayer(engine));
    this.root.add(circle);

    // Kick off persistence immediately so the network round-trip overlaps the
    // gameplay→scores transition; the Rank tab reads `submission` reactively.
    void this.submitPlayedScore();
  }

  public override onEntered() {
    // Crossfade the shared background from gameplay's dim treatment to the
    // brighter menu treatment of the same map (a no-op image change otherwise).
    backgroundLayer(this.engine).setSource(this.parsedMap.backgroundUrl, {
      variant: "menu",
      radius: SCORES_CIRCLE_RADIUS,
      offsetX: this.parsedMap.backgroundOffsetX,
      offsetY: this.parsedMap.backgroundOffsetY,
    });
    this.onAction("confirm", () => this.retry());
    this.onAction("back", () => this.backToSelection());
    this.onActionRepeat("nav-left", () => this.cycleTab(-1));
    this.onActionRepeat("nav-right", () => this.cycleTab(1));
    this.onStickRepeat("x", (dir) => this.cycleTab(dir));
    // Bumpers step through the three leaderboards (no-mods / modded / local).
    this.onAction("leaderboard-prev", () => this.cycleLeaderboardTab(-1));
    this.onAction("leaderboard-next", () => this.cycleLeaderboardTab(1));
    this.onAction("view-leaderboard", () => this.openLeaderboard());
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

  public cycleLeaderboardTab(dir: -1 | 1): void {
    this.leaderboardTab.set(cycleLeaderboardTab(this.leaderboardTab.get(), dir));
  }

  /**
   * Open the full beatmap leaderboard (the same scene the selection screen uses)
   * for the map just played, on whichever board the Rank tab is showing. A
   * crossfade overlay — the scores ring stays put behind it.
   */
  public openLeaderboard(): void {
    void this.sceneManager.transitionPush(
      new BeatmapLeaderboardScene(this.engine, {
        beatmapId: this.parsedMap.id,
        title: this.parsedMap.title,
        artist: this.parsedMap.artist,
        difficulty: this.parsedMap.difficulty,
        initialTab: this.leaderboardTab.get(),
        // The just-played run, so the full board highlights it and scrolls to it.
        currentScore: {
          localId: this.submission.get().localId,
          score: this.scoreCounter.getScore(),
          modded: this.modded,
        },
        exitFactory: crossfade,
      }),
      crossfade,
    );
  }

  public retry(): void {
    const next = new GameplayScene(this.engine, this.parsedMap, this.mods);
    void this.sceneManager.transitionReplace(next, fadeOutResizeIn);
  }

  public backToSelection(): void {
    void this.sceneManager.transitionPop(fadeResizeRevealStaged);
  }

  /**
   * Persist the finished play locally + to the global leaderboard, mirror the
   * outcome into `submission`, and invalidate the leaderboard queries so the
   * lists refetch with the new score. Fire-and-forget — failures surface as
   * graceful states in the Rank tab rather than blocking or alerting.
   */
  private async submitPlayedScore(): Promise<void> {
    const sc = this.scoreCounter;
    const { backendResult, localResult, loggedIn } = await submitScore({
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
      modded: this.modded,
      mods: describeMods(this.mods),
    });

    const localId = localResult.status === "fulfilled" ? localResult.value : null;
    // `backendResult` is null when logged out — no global attempt was made.
    const uploadedGlobal =
      backendResult !== null && backendResult.status === "fulfilled" && backendResult.value?.wasUploaded === true;
    const globalError = backendResult !== null && backendResult.status === "rejected";

    if (localResult.status === "rejected") {
      console.error("Failed to save score locally:", localResult.reason);
    }
    if (globalError) {
      console.error("Failed to submit score to backend:", backendResult.reason);
    }

    this.submission.set({ status: "settled", localId, uploadedGlobal, globalError, loggedIn });

    if (localId !== null) {
      browserQueryClient?.invalidateQueries({
        queryKey: localScoresBeatmapLeaderboardQueryOptions(this.parsedMap.id, LATEST_SCORE_VERSION).queryKey,
      });
    }
    if (uploadedGlobal) {
      browserQueryClient?.invalidateQueries({
        queryKey: scoresBeatmapLeaderboardQueryOptions(this.parsedMap.id, LATEST_SCORE_VERSION, this.modded).queryKey,
      });
    }
  }
}

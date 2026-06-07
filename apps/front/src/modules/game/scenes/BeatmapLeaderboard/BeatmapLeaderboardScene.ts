import {
  cycleLeaderboardTab,
  LEADERBOARD_TABS,
  type LeaderboardTab,
} from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import type { TransitionFactory } from "../../engine/transitions/TransitionContext";
import { Scene } from "../Scene";
import { BeatmapLeaderboardView } from "./BeatmapLeaderboardView";

/**
 * Identifies the just-played run so the board can highlight it and scroll to it.
 * Only set when the board is opened from the Scores screen — opened from beatmap
 * selection there is no "current score", so nothing is highlighted.
 */
export type CurrentScoreRef = {
  /** Dexie local-score id of the run — matches its row on the local board. */
  localId: number | null;
  /** The run's score value — matches its row on the global/modded board. */
  score: number;
  /** Which global board the run belongs to (modded vs no-mods). */
  modded: boolean;
};

export type BeatmapLeaderboardOpts = {
  beatmapId: string;
  title: string;
  artist: string;
  difficulty: number;
  /** Board to open on (carried over from the selection screen's compact widget). */
  initialTab: LeaderboardTab;
  /** The just-played run to highlight + reveal, or omitted when not from Scores. */
  currentScore?: CurrentScoreRef;
  exitFactory: TransitionFactory;
};

/**
 * Full-screen beatmap leaderboard: a podium for the top three and a
 * controller-scrollable ranked list below (global top 50 / modded top 50 /
 * the player's full local history). A DOM-only scene like PlayerRankings — the
 * React view renders the boards, the scene owns the active board + the list
 * cursor, the bumpers/left-right cycle boards, up/down (or the stick) scroll the
 * list, and B closes.
 */
export class BeatmapLeaderboardScene extends Scene {
  public readonly id = "beatmap-leaderboard";
  public override readonly UI = BeatmapLeaderboardView;

  public readonly beatmapId: string;
  public readonly title: string;
  public readonly artist: string;
  public readonly difficulty: number;
  /** The run to highlight + reveal (from Scores), or null (from selection). */
  public readonly currentScore: CurrentScoreRef | null;

  public readonly tab: Store<LeaderboardTab>;
  /** Cursor into the scrollable list below the podium (rows #4 and down). */
  public readonly selectedIndex = new Store<number>(0);

  /**
   * Sign of the most recent board change (+1 = moved right, -1 = left). Read at
   * animation time by the view so the outgoing/incoming boards slide the right
   * way — same trick as PlayerRankingsScene.tabDirection.
   */
  public tabDirection: -1 | 1 = 1;

  /** Length of the scrollable list (#4+), pushed up by the view so the cursor clamps. */
  private listLength = 0;
  private readonly exitFactory: TransitionFactory;

  constructor(engine: Engine, opts: BeatmapLeaderboardOpts) {
    super(engine);
    this.beatmapId = opts.beatmapId;
    this.title = opts.title;
    this.artist = opts.artist;
    this.difficulty = opts.difficulty;
    this.currentScore = opts.currentScore ?? null;
    this.tab = new Store<LeaderboardTab>(opts.initialTab);
    this.exitFactory = opts.exitFactory;
  }

  public override onEntered() {
    this.onAction("back", () => this.close());
    this.onAction("view-leaderboard", () => this.close());
    this.onAction("leaderboard-prev", () => this.cycleTab(-1));
    this.onAction("leaderboard-next", () => this.cycleTab(1));
    this.onAction("nav-left", () => this.cycleTab(-1));
    this.onAction("nav-right", () => this.cycleTab(1));
    this.onActionRepeat("nav-up", () => this.moveCursor(-1));
    this.onActionRepeat("nav-down", () => this.moveCursor(1));
    this.onStickRepeat("y", (dir) => this.moveCursor(dir));
  }

  /** The view reports the visible list length so the cursor never runs off the end. */
  public setListLength(length: number): void {
    this.listLength = length;
    const max = Math.max(0, length - 1);
    if (this.selectedIndex.get() > max) this.selectedIndex.set(max);
  }

  public cycleTab(dir: -1 | 1): void {
    this.tabDirection = dir;
    this.tab.set(cycleLeaderboardTab(this.tab.get(), dir));
    this.selectedIndex.set(0);
  }

  /** Jump straight to a board (clicked tab); direction inferred from the index delta. */
  public setTab(next: LeaderboardTab): void {
    const current = this.tab.get();
    if (next === current) return;
    this.tabDirection = LEADERBOARD_TABS.indexOf(next) > LEADERBOARD_TABS.indexOf(current) ? 1 : -1;
    this.tab.set(next);
    this.selectedIndex.set(0);
  }

  private moveCursor(delta: -1 | 1): void {
    if (this.listLength === 0) return;
    const max = this.listLength - 1;
    const next = Math.max(0, Math.min(max, this.selectedIndex.get() + delta));
    if (next !== this.selectedIndex.get()) this.selectedIndex.set(next);
  }

  public close() {
    void this.sceneManager.transitionPop(this.exitFactory);
  }
}

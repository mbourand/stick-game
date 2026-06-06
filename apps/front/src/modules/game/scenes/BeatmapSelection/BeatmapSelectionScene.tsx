import { motionValue, type MotionValue } from "motion/react";
import { type LeaderboardTab, cycleLeaderboardTab } from "@/app/game/_components/MapLeaderboard/MapLeaderboard";
import type { V3BeatmapEntity } from "@/modules/db/versions/v3";
import type { ParsedMap } from "../../../osu/convert/OsuConverter";
import { StickDotsEntity } from "../../entities/StickDotsEntity";
import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import type { TickContext } from "../../engine/TickContext";
import { crossfade, fadeOutResizeIn, resizeBetween } from "../transitions";
import { sharedCircle } from "../../sharedCircle";
import { BEATMAP_SELECTION_CIRCLE_RADIUS } from "../../utils/constants";
import { DownloaderScene } from "../Downloader/DownloaderScene";
import type { DifficultyFilter } from "../Filter/filterTypes";
import { FilterScene } from "../Filter/FilterScene";
import { GameplayScene } from "../Gameplay/GameplayScene";
import { ModsScene } from "../Mods/ModsScene";
import { SettingsScene } from "../Settings/SettingsScene";
import { type ActiveMods, NO_MODS } from "../../mods/mods";
import { CanvasScene } from "../CanvasScene";
import { pickIndexAtY } from "../shared/verticalPicker";
import { backgroundLayer } from "../../BackgroundLayer";
import { nowPlaying } from "../../nowPlaying";
import type { MediaUrls, NowPlayingController, NowPlayingTrack } from "../../NowPlayingController";
import { BeatmapSelectionView } from "./BeatmapSelectionView";
import {
  BUTTON_HEIGHT_PX,
  CIRCLE_RADIUS_PX,
  MAX_SCROLL_SPEED_ITEMS_PER_SEC,
  SCROLL_ZONE_Y_PX,
  STICK_ACTIVE_THRESHOLD,
  VERTICAL_PITCH_PX,
} from "./layout";

export type ScrollZone = "top" | "bottom" | null;
export type BeatmapResolver = (index: number) => Promise<ParsedMap | null>;
export type { MediaUrls } from "../../NowPlayingController";

export type LeftAction = {
  id: string;
  label: string;
  onActivate: () => void;
};

/**
 * Stick.x must commit at least this far to one side before we switch focus
 * between the left-action and right-beatmap columns. Pure-vertical pushes
 * fall in the dead zone in between, so the user can scan up/down without
 * accidentally hopping sides.
 */
const SIDE_COMMIT_THRESHOLD = 0.3;

export class BeatmapSelectionScene extends CanvasScene {
  public readonly id = "beatmap-selection";
  public override readonly UI = BeatmapSelectionView;
  public override get ringRadius(): number {
    return BEATMAP_SELECTION_CIRCLE_RADIUS;
  }

  public readonly focusedIndex = new Store<number | null>(null);
  public readonly scrollZone = new Store<ScrollZone>(null);
  public readonly leaderboardTab = new Store<LeaderboardTab>("global");
  public readonly focusedLeftButton = new Store<number | null>(null);

  /**
   * Active mods for the next play. Lives on the scene (not in the Mods overlay)
   * so the selection survives opening/closing the overlay, and is read by
   * playMap when launching gameplay. Mirrors the difficultyFilter pattern.
   */
  public readonly mods = new Store<ActiveMods>(NO_MODS);

  /**
   * Logical id of the currently/last focused beatmap. Lives on the scene
   * (not in a view ref) so it survives view remounts — used by reconciliation
   * to snap focus back to the same beatmap after a filter change or after
   * returning from an overlay scene that altered the list.
   */
  public readonly focusedBeatmapIdv2 = new Store<string | null>(null);

  /**
   * Search and difficulty filter live on the scene (not in the view's useState)
   * so they survive while the view unmounts during gameplay/scores/overlays —
   * when the user pops back here, the list re-renders with the same filter.
   */
  public readonly searchQuery = new Store<string>("");
  public readonly difficultyFilter = new Store<DifficultyFilter | null>(null);

  /**
   * When non-null, the list is scoped to exactly these beatmap idv2 keys — the
   * difficulties of the featured daily beatmapset. Acts like a special filter;
   * the DailyPanel toggles it on (after installing the set if needed) and off.
   */
  public readonly dailyScopeBeatmapIds = new Store<Set<string> | null>(null);

  /**
   * Left-column actions, defined here so both the view (renders them) and the
   * scene (handles stick / d-pad / confirm input for them) see the same
   * source of truth — no need to push counts/handlers through a context.
   */
  public readonly leftActions: readonly LeftAction[] = [
    // The daily button is the first left action so it joins the stick / d-pad
    // focus stack. Its actual behaviour lives in the React DailyPanel (it needs
    // the fetched daily data + install store), registered via setDailyActivate.
    { id: "daily", label: "Daily", onActivate: () => this.dailyActivate?.() },
    { id: "mods", label: "Mods", onActivate: () => this.openMods() },
    { id: "filter", label: "Filters", onActivate: () => this.openFilter() },
    { id: "download", label: "Download maps", onActivate: () => this.openDownloader() },
    { id: "settings", label: "Settings", onActivate: () => this.openSettings() },
  ];

  /** Handler the DailyPanel registers so gamepad "confirm" runs the same action as a click. */
  private dailyActivate: (() => void) | null = null;

  /**
   * One-shot intent set by the main menu's daily card: jump straight into the
   * daily flow on entry. Deferred until BOTH the DailyPanel has registered its
   * action AND the beatmap list has loaded — `DailyPanel.runAction` decides
   * "owned" from the list, so firing earlier would re-download an already-owned
   * set. `tryAutoDaily` fires once, from whichever of those two lands last.
   */
  private wantsAutoDaily: boolean;
  private listReady = false;

  /**
   * Continuous scroll position (float). A MotionValue so the view can drive
   * each visible button's transform/mask via useTransform without going
   * through React renders — scrolling is per-frame motion, not state.
   */
  public readonly scrollOffset: MotionValue<number> = motionValue(0);

  private beatmapCount = 0;
  private resolver: BeatmapResolver | null = null;

  private lastGameplayScene: GameplayScene | null = null;

  /**
   * The shared, persistent now-playing player (audio + circle background +
   * visualizer). Borrowed into this scene's tree in "preview" mode; the same
   * instance keeps playing on the menu (jukebox) so navigating between the two
   * never interrupts the song. Audio/cache lifecycle lives on the controller.
   */
  private get preview(): NowPlayingController {
    return nowPlaying(this.engine);
  }

  /** One-shot guard: pick a random map the first time the list arrives. */
  private hasPickedInitialFocus = false;

  /**
   * Latch: ignore stick input until it returns to neutral after each activation.
   * On entry the player's stick is usually still deflected from aiming the menu's
   * Play button — without this, that held-over deflection would instantly re-aim
   * focus to a beatmap at that angle, clobbering the carried-over song.
   */
  private stickNeedsRelease = false;

  constructor(engine: Engine, opts?: { autoActivateDaily?: boolean }) {
    super(engine);
    this.wantsAutoDaily = opts?.autoActivateDaily ?? false;
    // Land the initial focus on whatever the menu jukebox is playing, so the
    // song + background carry straight over as the selected map instead of
    // jumping to a random pick. Reconciliation in useSceneFocusSync snaps to
    // this id once the list loads; the now-playing media is already this map so
    // the preview is a no-op (no restart). Skipped for the daily flow, which
    // sets its own scope/focus.
    if (!this.wantsAutoDaily) {
      const playingId = nowPlaying(engine).playingBeatmapId;
      if (playingId) this.focusedBeatmapIdv2.set(playingId);
    }
    // Persistent background at the very back, then the now-playing visualizer.
    this.root.add(backgroundLayer(engine));
    this.root.add(this.preview);
    const circle = sharedCircle(engine);
    this.root.add(circle);
    this.root.add(new StickDotsEntity(this.inputSystem, circle));
  }

  public override onEntered() {
    this.onAction("back", () => this.goBack());
    this.onAction("confirm", () => void this.confirmFocused());
    this.onAction("leaderboard-prev", () => this.cycleLeaderboardTab(-1));
    this.onAction("leaderboard-next", () => this.cycleLeaderboardTab(1));
    this.onActionRepeat("nav-up", () => this.navByDPad(-1));
    this.onActionRepeat("nav-down", () => this.navByDPad(+1));
    // Returning from an overlay (downloader/filter) — drop the transient
    // left-column focus so the user lands back on their beatmap. focusedIndex
    // is preserved through overlays so we restore the same selection.
    this.focusedLeftButton.set(null);
    // Require the stick to return to neutral before it can drive focus — the
    // player is likely still holding it toward the menu's Play button.
    this.stickNeedsRelease = true;
    this.preview.setLive(true);
    this.preview.enterPreviewMode();
    // Re-arm preview only if it isn't already playing (no-op when the audio
    // survived an overlay; restarts it when coming back from gameplay/scores).
    this.preview.reArmIfNeeded();
  }

  public override onDestroy() {
    // The now-playing player is shared/persistent — detach it (don't destroy)
    // and DON'T stop its audio: popping back to the menu inherits the song.
    this.root.detach(this.preview);
    super.onDestroy();
  }

  public setBeatmapCount(count: number): void {
    if (count > 0 && !this.listReady) {
      this.listReady = true;
      this.tryAutoDaily();
    }
    if (this.beatmapCount === count) return;
    this.beatmapCount = count;

    if (count > 0 && !this.hasPickedInitialFocus) {
      const randomIndex = Math.floor(Math.random() * count);
      this.focusedIndex.set(randomIndex);
      this.scrollOffset.set(randomIndex);
      this.hasPickedInitialFocus = true;
    } else {
      const maxOffset = Math.max(0, count - 1);
      this.scrollOffset.set(Math.max(0, Math.min(maxOffset, this.scrollOffset.get())));
      const focused = this.focusedIndex.get();
      if (focused !== null && focused >= count) {
        this.focusedIndex.set(null);
      }
    }
  }

  public setBeatmapResolver(resolver: BeatmapResolver | null): void {
    this.resolver = resolver;
  }

  /**
   * Tell the scene which beatmap is currently hovered. Triggers an audio
   * preview + circle background. Pass null to clear both. `track` (title/artist)
   * and `beatmapId` are remembered so the menu jukebox can label the inherited
   * song and a later return to selection can re-focus the same map. Delegated to
   * the shared player, which owns the media lifecycle.
   */
  public setFocusedBeatmapMedia(
    media: MediaUrls | null,
    track: NowPlayingTrack | null = null,
    beatmapId: string | null = null,
  ): void {
    this.preview.setFocusedMedia(media, track, beatmapId);
  }

  /** Cached blob-URL lookup for a beatmap's audio + background (see the controller). */
  public resolveMediaUrls(beatmap: V3BeatmapEntity): Promise<MediaUrls | null> {
    return this.preview.resolveMediaUrls(beatmap);
  }

  /**
   * D-pad list navigation. Operates on whichever column is currently focused:
   * if the user is on the left action column, moves within it; otherwise
   * moves within the beatmap list and scrolls the visible window to track
   * the new focus.
   */
  private navByDPad(delta: -1 | 1): void {
    const leftFocused = this.focusedLeftButton.get();
    if (leftFocused !== null) {
      const count = this.leftActions.length;
      if (count === 0) return;
      const next = Math.max(0, Math.min(count - 1, leftFocused + delta));
      if (next !== leftFocused) this.focusedLeftButton.set(next);
      return;
    }

    if (this.beatmapCount === 0) return;
    const focused = this.focusedIndex.get();
    if (focused === null) {
      this.focusedIndex.set(0);
      this.scrollTo(0);
      return;
    }
    const next = Math.max(0, Math.min(this.beatmapCount - 1, focused + delta));
    if (next !== focused) {
      this.focusedIndex.set(next);
      this.scrollTo(next);
    }
  }

  public scrollBy(deltaItems: number): void {
    const current = this.scrollOffset.get();
    const next = Math.max(0, Math.min(this.beatmapCount - 1, current + deltaItems));
    if (next === current) return;
    this.scrollOffset.set(next);
  }

  public scrollTo(index: number): void {
    this.scrollOffset.set(Math.max(0, Math.min(this.beatmapCount - 1, index)));
  }

  /**
   * Enter "daily" mode: scope the list to the featured set's difficulties and
   * drop any active search/difficulty filter so they're all visible. `idv2s`
   * are ordered easiest→hardest; we remember the easiest so focus snaps to it
   * once the (re)filtered list lands.
   */
  public activateDailyScope(idv2s: string[]): void {
    this.searchQuery.set("");
    this.difficultyFilter.set(null);
    this.focusedLeftButton.set(null);
    if (idv2s.length > 0) this.focusedBeatmapIdv2.set(idv2s[0]);
    this.dailyScopeBeatmapIds.set(new Set(idv2s));
  }

  public clearDailyScope(): void {
    this.dailyScopeBeatmapIds.set(null);
  }

  /** The DailyPanel registers (and clears) its click handler here so the scene's
   * confirm/gamepad path can trigger the same behaviour. */
  public setDailyActivate(fn: (() => void) | null): void {
    this.dailyActivate = fn;
    if (fn) this.tryAutoDaily();
  }

  /**
   * Fire the main-menu "jump into the daily" intent exactly once, and only when
   * the daily action is registered and the list has loaded (so its owned/scope
   * logic is trustworthy). A no-op otherwise — called from both readiness edges.
   */
  private tryAutoDaily(): void {
    if (!this.wantsAutoDaily || !this.dailyActivate || !this.listReady) return;
    this.wantsAutoDaily = false;
    this.dailyActivate();
  }

  public cycleLeaderboardTab(dir: -1 | 1): void {
    this.leaderboardTab.set(cycleLeaderboardTab(this.leaderboardTab.get(), dir));
  }

  public async confirmFocused(): Promise<void> {
    const leftIdx = this.focusedLeftButton.get();
    if (leftIdx !== null) {
      this.leftActions[leftIdx]?.onActivate();
      return;
    }
    const idx = this.focusedIndex.get();
    if (idx === null || !this.resolver) return;
    const parsed = await this.resolver(idx);
    if (parsed) this.playMap(parsed);
  }

  public playMap(map: ParsedMap): void {
    // Suspend the now-playing player before gameplay — gameplay starts its own
    // audio (a different channel) from 0, so stop ours and forbid a re-arm until
    // we're back on the menu/selection.
    this.preview.suspend();
    this.lastGameplayScene?.remove();
    const gameplayScene = new GameplayScene(this.engine, map, this.mods.get());
    void this.sceneManager.transitionPush(gameplayScene, fadeOutResizeIn);
    this.lastGameplayScene = gameplayScene;
  }

  public goBack(): void {
    // Don't stop the now-playing player — the menu inherits the song + background
    // and continues it (its jukebox takes over when the track ends). Only the
    // ring resizes; the persistent background stays put.
    void this.sceneManager.transitionPop(resizeBetween);
  }

  public openDownloader(): void {
    // Preview audio is deliberately left playing — the downloader is just an
    // overlay scene and we want the user's track to keep going behind it.
    void this.sceneManager.transitionPush(new DownloaderScene(this.engine), crossfade);
  }

  public openMods(): void {
    // Preview audio keeps playing under the overlay (same as filter/settings).
    void this.sceneManager.transitionPush(new ModsScene(this.engine, this.mods), crossfade);
  }

  public openFilter(): void {
    void this.sceneManager.transitionPush(
      new FilterScene(this.engine, this.difficultyFilter),
      crossfade,
    );
  }

  public openSettings(): void {
    // Preview audio keeps playing under the settings overlay (same as the
    // downloader / filter overlays) — the user is just popping a config panel
    // on top, not navigating away.
    void this.sceneManager.transitionPush(
      new SettingsScene(this.engine, crossfade),
      crossfade,
    );
  }

  public override update(tick: TickContext): void {
    // Only poll the stick while active — during the enter transition the held
    // stick (and the React-driven focus reconciliation) shouldn't fight.
    if (this.isActive() && this.beatmapCount > 0) this.processStickInput(tick.dt);
    super.update(tick);
  }

  private processStickInput(dt: number): void {
    const stick = this.getActiveStick(STICK_ACTIVE_THRESHOLD);
    // Held-over deflection from the previous scene: wait for a neutral stick
    // once, then resume normal navigation.
    if (this.stickNeedsRelease) {
      if (!stick) this.stickNeedsRelease = false;
      this.scrollZone.set(null);
      return;
    }
    if (!stick) {
      this.scrollZone.set(null);
      return;
    }

    const stickY = stick.y * CIRCLE_RADIUS_PX;

    if (stickY < -SCROLL_ZONE_Y_PX) {
      this.scrollZone.set("top");
      this.applyContinuousScroll(stickY, -1, dt);
      return;
    }
    if (stickY > SCROLL_ZONE_Y_PX) {
      this.scrollZone.set("bottom");
      this.applyContinuousScroll(stickY, +1, dt);
      return;
    }

    this.scrollZone.set(null);

    if (stick.x > SIDE_COMMIT_THRESHOLD) {
      // Right side: beatmap buttons.
      this.focusedLeftButton.set(null);
      const picked = this.pickButtonAtY(stickY);
      if (picked !== null) this.focusedIndex.set(picked);
    } else if (stick.x < -SIDE_COMMIT_THRESHOLD) {
      // Left side: action buttons. focusedIndex is intentionally NOT cleared
      // — it's the "last focused beatmap" we restore to on overlay close. The
      // view hides the beatmap focus while focusedLeftButton is set.
      if (this.leftActions.length === 0) return;
      const picked = this.pickLeftButtonAtY(stickY);
      if (picked !== null) this.focusedLeftButton.set(picked);
    }
    // Otherwise: pure-vertical push, keep current focus.
  }

  private pickLeftButtonAtY(targetY: number): number | null {
    return pickIndexAtY({
      targetY,
      count: this.leftActions.length,
      pitchPx: VERTICAL_PITCH_PX,
      halfHeightPx: BUTTON_HEIGHT_PX / 2,
      // Mirrors getLeftButtonYCenter — buttons centred symmetrically around y=0.
      originItems: (this.leftActions.length - 1) / 2,
    });
  }

  private applyContinuousScroll(stickY: number, direction: 1 | -1, dt: number): void {
    const overshoot = Math.abs(stickY) - SCROLL_ZONE_Y_PX;
    const range = CIRCLE_RADIUS_PX - SCROLL_ZONE_Y_PX;
    const intensity = Math.min(1, overshoot / Math.max(1, range));
    this.scrollBy(direction * intensity * MAX_SCROLL_SPEED_ITEMS_PER_SEC * (dt / 1000));
  }

  private pickButtonAtY(targetY: number): number | null {
    return pickIndexAtY({
      targetY,
      count: this.beatmapCount,
      pitchPx: VERTICAL_PITCH_PX,
      halfHeightPx: BUTTON_HEIGHT_PX / 2,
      originItems: this.scrollOffset.get(),
    });
  }

}

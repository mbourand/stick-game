import { StickDotsEntity } from "../../entities/StickDotsEntity";
import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import type { TickContext } from "../../engine/TickContext";
import { crossfade, resizeBetween } from "../transitions";
import { sharedCircle } from "../../sharedCircle";
import { BeatmapSelectionScene } from "../BeatmapSelection/BeatmapSelectionScene";
import { CanvasScene } from "../CanvasScene";
import { SettingsScene } from "../Settings/SettingsScene";
import { ProfileScene } from "../Profile/ProfileScene";
import { backgroundLayer } from "../../BackgroundLayer";
import { nowPlaying } from "../../nowPlaying";
import type { NowPlayingController } from "../../NowPlayingController";
import {
  BUTTON_HEIGHT_PX,
  BUTTONS,
  getButtonYOffsetFromCenter,
  JUKEBOX_CONTROLS,
  jukeboxControlAtPoint,
  MAIN_MENU_CIRCLE_RADIUS,
  type ButtonId,
} from "./layout";
import { MainMenuView } from "./MainMenuView";

/** The stick must reach near its edge before it drives focus at all. */
const STICK_ACTIVE_THRESHOLD = 0.9;
/**
 * How far the stick must commit to one side before focus hops columns. A
 * near-vertical push falls in the dead band between -this and +this and keeps
 * the current column, so the player can scan up/down without flipping sides.
 */
const SIDE_COMMIT_THRESHOLD = 0.3;
/**
 * Minimum stick deflection for the transport-row hover test to engage. Low,
 * because the controls sit inside the ring (not at the edge), so the stick dot
 * reaches them at a partial push.
 */
const JUKEBOX_HOVER_MIN_MAGNITUDE = 0.28;

export class MainMenuScene extends CanvasScene {
  public readonly id = "main-menu";
  public override readonly UI = MainMenuView;
  public override get ringRadius(): number {
    return MAIN_MENU_CIRCLE_RADIUS;
  }

  /** Focused right-column button, or null. Mutually exclusive with `dailyFocused`. */
  public readonly focused = new Store<ButtonId | null>(null);
  /** Whether the left-column daily card holds focus. */
  public readonly dailyFocused = new Store<boolean>(false);
  /**
   * Set by the view once the daily query has data, so the scene never focuses a
   * card that isn't on screen — mirrors BeatmapSelection guarding its left
   * column with `if (this.leftActions.length === 0) return`.
   */
  public readonly dailyAvailable = new Store<boolean>(false);
  /** Focused jukebox transport control (index into JUKEBOX_CONTROLS), or null. */
  public readonly jukeboxFocus = new Store<number | null>(null);

  /** The shared now-playing player, for the view (label + transport controls). */
  public get player(): NowPlayingController {
    return nowPlaying(this.engine);
  }

  constructor(engine: Engine) {
    super(engine);
    // Size the shared ring to the menu radius at boot — no transition runs for
    // the first scene, so it would otherwise rest at the default (smaller)
    // radius until the first navigation. Transitions handle later resizes.
    const circle = sharedCircle(engine);
    circle.radius = MAIN_MENU_CIRCLE_RADIUS;
    // Persistent background at the very back, then the shared now-playing player
    // (visualizer) in front of it; both behind the ring and stick dots.
    this.root.add(backgroundLayer(engine));
    this.root.add(nowPlaying(engine));
    this.root.add(circle);
    this.root.add(new StickDotsEntity(this.inputSystem, circle));
  }

  public override onEntered() {
    this.onAction("confirm", () => this.confirmFocused());
    this.onActionRepeat("nav-up", () => this.moveFocus(-1));
    this.onActionRepeat("nav-down", () => this.moveFocus(+1));
    this.onAction("nav-left", () => this.navHorizontal(-1));
    this.onAction("nav-right", () => this.navHorizontal(+1));

    // Resume the shared player and run the menu jukebox (random library tracks,
    // inheriting whatever was playing in selection).
    const player = nowPlaying(this.engine);
    player.setLive(true);
    void player.enterJukeboxMode();
  }

  public override onDestroy() {
    // The now-playing player is shared/persistent — detach (don't destroy) it,
    // and leave its audio playing. (The menu is the root scene, so this rarely
    // runs, but keep it correct.)
    this.root.detach(nowPlaying(this.engine));
    super.onDestroy();
  }

  private confirmFocused(): void {
    const control = this.jukeboxFocus.get();
    if (control !== null) {
      this.activateJukebox(control);
      return;
    }
    if (this.dailyFocused.get()) {
      this.goToDailyChallenge();
      return;
    }
    const id = this.focused.get();
    if (id !== null) this.activateFocused(id);
  }

  private activateJukebox(control: number): void {
    const action = JUKEBOX_CONTROLS[control];
    if (action === "previous") this.player.previous();
    else if (action === "pause") this.player.togglePause();
    else this.player.skip();
  }

  /**
   * D-pad up/down. Within the right column it moves between buttons; from the
   * last button, down drops onto the jukebox row (and up from the row returns).
   * From the daily card, up/down hops back into the right column.
   */
  private moveFocus(delta: -1 | 1): void {
    if (this.jukeboxFocus.get() !== null) {
      if (delta === -1) this.focusLastButton();
      return;
    }
    if (this.dailyFocused.get()) {
      this.focusRightColumn();
      return;
    }
    const current = this.focused.get();
    if (current === null) {
      this.focused.set(BUTTONS[0].id);
      return;
    }
    const idx = BUTTONS.findIndex((b) => b.id === current);
    if (delta === 1 && idx === BUTTONS.length - 1) {
      this.focusJukebox(1); // drop onto the centre control (pause)
      return;
    }
    const next = Math.max(0, Math.min(BUTTONS.length - 1, idx + delta));
    if (next !== idx) this.focused.set(BUTTONS[next].id);
  }

  /** D-pad left/right: within the jukebox row it moves between controls; otherwise it switches columns. */
  private navHorizontal(delta: -1 | 1): void {
    const control = this.jukeboxFocus.get();
    if (control !== null) {
      this.jukeboxFocus.set(Math.max(0, Math.min(JUKEBOX_CONTROLS.length - 1, control + delta)));
      return;
    }
    if (delta === -1) this.focusDaily();
    else this.focusRightColumn();
  }

  private focusDaily(): void {
    if (!this.dailyAvailable.get()) return;
    this.dailyFocused.set(true);
    this.focused.set(null);
    this.jukeboxFocus.set(null);
  }

  private focusRightColumn(): void {
    if (this.jukeboxFocus.get() !== null) {
      this.focusLastButton();
      return;
    }
    if (!this.dailyFocused.get()) return;
    this.dailyFocused.set(false);
    if (this.focused.get() === null) this.focused.set(BUTTONS[0].id);
  }

  /** Move focus onto a jukebox control, if a track is actually playing. */
  private focusJukebox(control: number): void {
    if (this.player.currentTrack.get() === null) return;
    this.jukeboxFocus.set(control);
    this.focused.set(null);
    this.dailyFocused.set(false);
  }

  private focusLastButton(): void {
    this.jukeboxFocus.set(null);
    this.focused.set(BUTTONS[BUTTONS.length - 1].id);
  }

  public activateFocused(id: ButtonId) {
    if (id === "play") this.goToBeatmapSelection();
    else if (id === "settings") this.openSettings();
    else if (id === "account") this.openProfile();
  }

  public goToBeatmapSelection() {
    void this.sceneManager.transitionPush(new BeatmapSelectionScene(this.engine), resizeBetween);
  }

  public goToDailyChallenge() {
    void this.sceneManager.transitionPush(
      new BeatmapSelectionScene(this.engine, { autoActivateDaily: true }),
      resizeBetween,
    );
  }

  public openSettings() {
    void this.sceneManager.transitionPush(new SettingsScene(this.engine, crossfade), crossfade);
  }

  public openProfile() {
    void this.sceneManager.transitionPush(new ProfileScene(this.engine, crossfade), crossfade);
  }

  public override update(tick: TickContext) {
    this.processStickInput();
    super.update(tick);
  }

  /**
   * Stick focus. The stick acts as a pointer (the stick dot renders at
   * stick·radius): if it hovers a transport control, focus it. Otherwise an
   * edge-level push commits a column — right aims a button by stick.y, left
   * picks the daily card. A resting / partial push keeps the current focus.
   */
  private processStickInput(): void {
    const stick = this.getActiveStick(JUKEBOX_HOVER_MIN_MAGNITUDE);
    if (!stick) return;

    // Spatial hover of the transport row takes priority (only while it's shown).
    if (this.player.currentTrack.get() !== null) {
      const control = jukeboxControlAtPoint(
        stick.x * MAIN_MENU_CIRCLE_RADIUS,
        stick.y * MAIN_MENU_CIRCLE_RADIUS,
      );
      if (control !== null) {
        this.focusJukebox(control);
        return;
      }
    }

    // Columns still require an edge-level commit (unchanged feel).
    if (Math.hypot(stick.x, stick.y) < STICK_ACTIVE_THRESHOLD) return;

    if (stick.x > SIDE_COMMIT_THRESHOLD) {
      const target = this.buttonAimedByStickY(stick.y);
      if (target !== null) {
        this.dailyFocused.set(false);
        this.jukeboxFocus.set(null);
        this.focused.set(target);
      }
    } else if (stick.x < -SIDE_COMMIT_THRESHOLD) {
      this.focusDaily();
    }
    // Otherwise: keep the current focus.
  }

  private buttonAimedByStickY(stickY: number): ButtonId | null {
    const projectedY = stickY * MAIN_MENU_CIRCLE_RADIUS;
    for (let i = 0; i < BUTTONS.length; i++) {
      const yOffset = getButtonYOffsetFromCenter(i);
      if (Math.abs(projectedY - yOffset) <= BUTTON_HEIGHT_PX / 2) {
        return BUTTONS[i].id;
      }
    }
    return null;
  }
}

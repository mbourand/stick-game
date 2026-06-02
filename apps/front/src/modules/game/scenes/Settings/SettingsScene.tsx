import type { Engine } from "../../engine/Engine";
import { Store } from "../../engine/state/Store";
import type { TransitionFactory } from "../../engine/transitions/TransitionContext";
import { Scene } from "../Scene";
import { SETTINGS_ROWS, type SettingsRow, type SliderRow } from "./fields";
import { SettingsView } from "./SettingsView";

/**
 * Lists the connected gamepad options the user can cycle through. `null`
 * (Auto — first connected pad wins) is always the first option, so the user
 * can fall back to automatic detection.
 */
export type GamepadOption = { index: number | null; label: string };

export class SettingsScene extends Scene {
  public readonly id = "settings";
  public override readonly UI = SettingsView;

  public readonly rows: readonly SettingsRow[] = SETTINGS_ROWS;
  public readonly focused = new Store<number>(0);
  /**
   * True while a text row is capturing keystrokes. Navigation and slider
   * adjustment are suppressed in this mode so typed keys can't double-fire as
   * menu actions; the view drives the actual text capture.
   */
  public readonly isEditingText = new Store<boolean>(false);
  /**
   * Connected gamepads the user can cycle through on nav-left/right. Kept
   * current by the scene itself — it seeds the list on enter and refreshes it
   * from the `Gamepad`'s `onConnectedChanged` event, so the scene doesn't
   * depend on its view pumping `navigator.getGamepads` in.
   */
  public readonly gamepadOptions = new Store<readonly GamepadOption[]>([{ index: null, label: "Auto" }]);

  /**
   * Transition factory used when the user backs out. Supplied by whoever
   * pushed this scene — the settings scene doesn't need to know its parent,
   * the caller picks the visual choreography.
   */
  private readonly exitFactory: TransitionFactory;

  constructor(engine: Engine, exitFactory: TransitionFactory) {
    super(engine);
    this.exitFactory = exitFactory;
  }

  public override onEntered() {
    this.onAction("back", () => this.onBack());
    this.onAction("confirm", () => this.onConfirm());
    this.onActionRepeat("nav-up", () => this.moveFocus(-1));
    this.onActionRepeat("nav-down", () => this.moveFocus(+1));
    this.onActionRepeat("nav-left", () => this.adjust(-1));
    this.onActionRepeat("nav-right", () => this.adjust(+1));
    this.onStickRepeat("y", (dir) => this.moveFocus(dir));
    this.onStickRepeat("x", (dir) => this.adjust(dir));

    this.refreshGamepadOptions();
    this.registerDisposer(
      this.engine.gamepad.events.on("onConnectedChanged", () => this.refreshGamepadOptions()),
    );
  }

  /** Rebuild the controller picker from the live list of connected pads. */
  private refreshGamepadOptions(): void {
    const options: GamepadOption[] = [{ index: null, label: "Auto" }];
    for (const pad of this.engine.gamepad.listConnected()) {
      options.push({ index: pad.index, label: `${pad.index}: ${pad.id}` });
    }
    this.gamepadOptions.set(options);
  }

  public moveFocus(delta: -1 | 1): void {
    if (this.isEditingText.get()) return;
    const next = Math.max(0, Math.min(this.rows.length - 1, this.focused.get() + delta));
    this.focused.set(next);
  }

  public setFocused(index: number): void {
    if (index < 0 || index >= this.rows.length) return;
    this.focused.set(index);
  }

  /**
   * Apply a text-input update to the currently focused row. No-op if the
   * focused row isn't a text row — keeps the view free of "is this a text
   * row?" checks while still funnelling all writes through the scene.
   */
  public applyTypingToFocusedTextRow(updater: (current: string) => string): void {
    const row = this.rows[this.focused.get()];
    if (row.kind !== "text") return;
    const current = row.read(this.engine.settings.get());
    row.write(this.engine.settings, updater(current));
  }

  private adjust(dir: -1 | 1): void {
    if (this.isEditingText.get()) return;
    const row = this.rows[this.focused.get()];
    if (row.kind === "slider") this.adjustSlider(row, dir);
    else if (row.kind === "gamepad") this.cycleGamepad(dir);
    // text rows aren't adjusted via arrows — confirm enters edit mode instead.
  }

  private adjustSlider(row: SliderRow, dir: -1 | 1): void {
    const current = row.read(this.engine.settings.get());
    const next = Math.max(row.min, Math.min(row.max, current + dir * row.step));
    if (next !== current) row.write(this.engine.settings, next);
  }

  private cycleGamepad(dir: -1 | 1): void {
    const options = this.gamepadOptions.get();
    if (options.length === 0) return;
    const current = this.engine.settings.get().selectedGamepadIndex;
    const currentIdx = Math.max(0, options.findIndex((o) => o.index === current));
    const nextIdx = (currentIdx + dir + options.length) % options.length;
    this.engine.settings.set("selectedGamepadIndex", options[nextIdx].index);
  }

  private onConfirm(): void {
    const row = this.rows[this.focused.get()];
    if (row.kind === "text") this.isEditingText.set(!this.isEditingText.get());
  }

  private onBack(): void {
    if (this.isEditingText.get()) {
      this.isEditingText.set(false);
      return;
    }
    void this.sceneManager.transitionPop(this.exitFactory);
  }
}

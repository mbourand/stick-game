import { EventManager } from "@/modules/game/events/EventManager";
import { IntroSkipRequested } from "@/modules/game/events/impl/IntroSkipRequestedEvent";
import { Gamepad } from "@/modules/gamepad/Gamepad";
import { GamepadButtonKind } from "@/modules/gamepad/mapping/types";

const MINIMUM_WAIT_TIME_FOR_SKIP_TO_BE_ENABLED = 5000; // 5 seconds
const SKIP_TARGET_TIME_OFFSET = -2000; // Skip 2 seconds before first note

export class IntroSkipper {
  private firstNoteHitTime: number;
  private gamepad: Gamepad;
  private eventManager: EventManager;
  private skipWasRequested: boolean;

  constructor(firstNoteHitTime: number, gamepad: Gamepad, eventManager: EventManager) {
    this.firstNoteHitTime = firstNoteHitTime;
    this.gamepad = gamepad;
    this.skipWasRequested = false;
    this.eventManager = eventManager;
  }

  public isActive(elapsedTime: number) {
    return !this.skipWasRequested && this.firstNoteHitTime > elapsedTime + MINIMUM_WAIT_TIME_FOR_SKIP_TO_BE_ENABLED;
  }

  public update(elapsedTime: number): void {
    if (!this.isActive(elapsedTime)) return;

    const areBothSticksPressed =
      this.gamepad.isButtonPressed(GamepadButtonKind.LeftStickClick) &&
      this.gamepad.isButtonPressed(GamepadButtonKind.RightStickClick);
    if (!areBothSticksPressed) return;
    this.eventManager.emit("onIntroSkipRequested", IntroSkipRequested(this.firstNoteHitTime + SKIP_TARGET_TIME_OFFSET));
    this.skipWasRequested = true;
  }
}

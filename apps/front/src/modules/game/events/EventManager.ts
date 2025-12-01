import type { NoteHoldTickEventType } from "./impl/NoteHoldTickEvent";
import type { NoteWasJudgedEventType } from "./impl/NoteWasJudgedEvent";
import type { NoteReachedEndOfLifeEventType } from "./impl/NoteReachedEndOfLifeEvent";
import type { NoteShouldSpawnEventType } from "./impl/NoteShouldSpawnEvent";
import type { SettingChangedEventType } from "./impl/SettingChangedEventType";
import { BeatmapEndedEventType } from "@/modules/game/events/impl/BeatmapEndedEvent";
import { IntroSkipRequestedEventType } from "@/modules/game/events/impl/IntroSkipRequestedEvent";

type EventType =
  | "onNoteWasJudged"
  | "onNoteShouldSpawn"
  | "onNoteReachedEndOfLife"
  | "onNoteHoldTick"
  | "onSettingChanged"
  | "onBeatmapEnded"
  | "onIntroSkipRequested";

type EventHandlers = {
  onNoteWasJudged: (e: NoteWasJudgedEventType) => void;
  onNoteShouldSpawn: (e: NoteShouldSpawnEventType) => void;
  onNoteReachedEndOfLife: (e: NoteReachedEndOfLifeEventType) => void;
  onNoteHoldTick: (e: NoteHoldTickEventType) => void;
  onSettingChanged: (e: SettingChangedEventType) => void;
  onBeatmapEnded: (e: BeatmapEndedEventType) => void;
  onIntroSkipRequested: (e: IntroSkipRequestedEventType) => void;
};

type EventHandlersArray = {
  [K in EventType]: EventHandlers[K][];
};

export class EventManager {
  private handlers: Partial<EventHandlersArray> = {};

  public on<K extends EventType>(eventType: K, handler: EventHandlers[K]) {
    this.handlers[eventType] = this.handlers[eventType] || [];
    this.handlers[eventType].push(handler);

    return () => this.off(eventType, handler);
  }

  public emit<K extends EventType>(eventType: K, event: Parameters<EventHandlers[K]>[0]) {
    const handlers = this.handlers[eventType];
    if (handlers) {
      handlers.forEach((handler) => handler(event as never));
    }
  }

  public off<K extends EventType>(eventType: K, handler: EventHandlers[K]) {
    const handlers = this.handlers[eventType];
    if (handlers) {
      // @ts-expect-error zegez
      this.handlers[eventType] = handlers.filter((h) => h !== handler);
    }
  }
}

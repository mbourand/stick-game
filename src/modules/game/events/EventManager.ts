import type { NoteHoldTickEventType } from "./impl/NoteHoldTickEventType";
import type { NoteReachedEdgeEventType } from "./impl/NoteReachedEdgeEvent";
import type { NoteReachedEndOfLifeEventType } from "./impl/NoteReachedEndOfLifeEventType";
import type { NoteShouldSpawnEventType } from "./impl/NoteShouldSpawnEvent";

type EventType = "onNoteReachedEdge" | "onNoteShouldSpawn" | "onNoteReachedEndOfLife" | "onNoteHoldTick";

type EventHandlers = {
  onNoteReachedEdge: (e: NoteReachedEdgeEventType) => void;
  onNoteShouldSpawn: (e: NoteShouldSpawnEventType) => void;
  onNoteReachedEndOfLife: (e: NoteReachedEndOfLifeEventType) => void;
  onNoteHoldTick: (e: NoteHoldTickEventType) => void;
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
      handlers.forEach((handler) => handler(event as any));
    }
  }

  public off<K extends EventType>(eventType: K, handler: EventHandlers[K]) {
    const handlers = this.handlers[eventType];
    if (handlers) {
      // @ts-ignore
      this.handlers[eventType] = handlers.filter((h) => h !== handler);
    }
  }
}

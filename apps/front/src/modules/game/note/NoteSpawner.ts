import { DEFAULT_JUDGE } from "@/modules/game/judge/Judge";
import type { ParsedNote } from "../../osu/convert/OsuConverter";
import type { EventManager } from "../events/EventManager";
import { NoteShouldSpawnEvent } from "../events/impl/NoteShouldSpawnEvent";
import { BeatmapEndedEvent } from "@/modules/game/events/impl/BeatmapEndedEventType";

export class NoteSpawner {
  private elapsedTime: number;
  private parsedNotes: ParsedNote[];
  private lastNoteIndex = -1;
  private eventManager: EventManager;
  private scrollDuration: number;
  private elapsedTimeSinceLastNoteSpawn = 0;
  private startTime: number;

  private hasFinished = false;

  constructor(parsedNotes: ParsedNote[], eventManager: EventManager, scrollDuration: number) {
    this.startTime = Math.min(parsedNotes[0].hitTime - scrollDuration, 0);
    this.elapsedTime = this.startTime;
    this.parsedNotes = parsedNotes;
    this.eventManager = eventManager;
    this.scrollDuration = scrollDuration;
  }

  public setScrollDuration(scrollDuration: number) {
    this.scrollDuration = scrollDuration;
  }

  public getStartTime() {
    return this.startTime;
  }

  public update(deltaTime: number) {
    if (this.hasFinished) return;

    this.elapsedTime += deltaTime;

    for (let i = this.lastNoteIndex + 1; i < this.parsedNotes.length; i++) {
      if (this.elapsedTime < this.parsedNotes[i].hitTime - this.scrollDuration) break;

      this.lastNoteIndex = i;
      this.eventManager.emit("onNoteShouldSpawn", NoteShouldSpawnEvent(this.parsedNotes[i]));
    }

    const hasLastNoteSpawned = this.lastNoteIndex >= this.parsedNotes.length - 1;
    if (hasLastNoteSpawned) {
      this.elapsedTimeSinceLastNoteSpawn += deltaTime;
      if (this.elapsedTimeSinceLastNoteSpawn >= this.scrollDuration + DEFAULT_JUDGE.getLargestWindow()) {
        this.eventManager.emit("onBeatmapEnded", BeatmapEndedEvent());
        this.hasFinished = true;
      }
    }
  }
}

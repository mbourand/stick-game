import type { ParsedNote } from "../../osu/convert/OsuConverter";
import type { EventManager } from "../events/EventManager";
import { NoteShouldSpawnEvent } from "../events/impl/NoteShouldSpawnEvent";

export class NoteSpawner {
  private elapsedTime: number;
  private parsedNotes: ParsedNote[];
  private lastNoteIndex: number = -1;
  private eventManager: EventManager;
  private scrollDuration: number;

  constructor(parsedNotes: ParsedNote[], eventManager: EventManager, scrollDuration: number) {
    this.elapsedTime = 0;
    this.parsedNotes = parsedNotes;
    this.eventManager = eventManager;
    this.scrollDuration = scrollDuration;
  }

  public setScrollDuration(scrollDuration: number) {
    this.scrollDuration = scrollDuration;
  }

  public update(deltaTime: number) {
    this.elapsedTime += deltaTime;

    for (let i = this.lastNoteIndex + 1; i < this.parsedNotes.length; i++) {
      if (this.elapsedTime < this.parsedNotes[i].hitTime - this.scrollDuration) break;

      this.lastNoteIndex = i;
      this.eventManager.emit("onNoteShouldSpawn", NoteShouldSpawnEvent(this.parsedNotes[i]));
    }
  }
}

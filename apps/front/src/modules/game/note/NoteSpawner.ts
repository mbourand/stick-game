import { DEFAULT_JUDGE } from "@/modules/game/judge/Judge";
import type { ParsedNote } from "../../osu/convert/OsuConverter";
import type { EventEmitter } from "../../utils/EventEmitter";
import type { BeatmapClock } from "../engine/BeatmapClock";
import type { Entity } from "../engine/Entity";
import type { GameplayEvents } from "../events/gameplayEvents";
import { NoteShouldSpawnEvent } from "../events/impl/NoteShouldSpawnEvent";
import { BeatmapEndedEvent } from "@/modules/game/events/impl/BeatmapEndedEvent";

export class NoteSpawner implements Entity {
  private parsedNotes: ParsedNote[];
  private lastNoteIndex = -1;
  private eventManager: EventEmitter<GameplayEvents>;
  private clock: BeatmapClock;
  private scrollDuration: number;
  private hasFinished = false;

  constructor(
    parsedNotes: ParsedNote[],
    eventManager: EventEmitter<GameplayEvents>,
    clock: BeatmapClock,
    scrollDuration: number,
  ) {
    this.parsedNotes = parsedNotes;
    this.eventManager = eventManager;
    this.clock = clock;
    this.scrollDuration = scrollDuration;
  }

  public setScrollDuration(scrollDuration: number) {
    this.scrollDuration = scrollDuration;
  }

  public getInitialOffsetMs(): number {
    return Math.min(this.parsedNotes[0].hitTime - this.scrollDuration, 0);
  }

  public update() {
    if (this.hasFinished) return;

    const now = this.clock.now();

    for (let i = this.lastNoteIndex + 1; i < this.parsedNotes.length; i++) {
      if (now < this.parsedNotes[i].hitTime - this.scrollDuration) break;

      this.lastNoteIndex = i;
      this.eventManager.emit("onNoteShouldSpawn", NoteShouldSpawnEvent(this.parsedNotes[i]));
    }

    const hasLastNoteSpawned = this.lastNoteIndex >= this.parsedNotes.length - 1;
    if (hasLastNoteSpawned) {
      const lastNote = this.parsedNotes[this.lastNoteIndex];
      const endTime = lastNote.hitTime + (lastNote.holdDuration ?? 0) + DEFAULT_JUDGE.getLargestWindow();
      if (now >= endTime) {
        this.eventManager.emit("onBeatmapEnded", BeatmapEndedEvent());
        this.hasFinished = true;
      }
    }
  }

  public render() {}
}

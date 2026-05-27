import type { BeatmapEndedEventType } from "./impl/BeatmapEndedEvent";
import type { NoteHoldTickEventType } from "./impl/NoteHoldTickEvent";
import type { NoteReachedEndOfLifeEventType } from "./impl/NoteReachedEndOfLifeEvent";
import type { NoteShouldSpawnEventType } from "./impl/NoteShouldSpawnEvent";
import type { NoteWasJudgedEventType } from "./impl/NoteWasJudgedEvent";

export type GameplayEvents = {
  onNoteWasJudged: (e: NoteWasJudgedEventType) => void;
  onNoteShouldSpawn: (e: NoteShouldSpawnEventType) => void;
  onNoteReachedEndOfLife: (e: NoteReachedEndOfLifeEventType) => void;
  onNoteHoldTick: (e: NoteHoldTickEventType) => void;
  onBeatmapEnded: (e: BeatmapEndedEventType) => void;
};

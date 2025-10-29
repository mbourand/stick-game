import type { ParsedNote } from "../../../osu/convert/OsuConverter";

export const NoteShouldSpawnEvent = (parsedNote: ParsedNote) => {
  return {
    get parsedNote() {
      return parsedNote;
    },
  };
};

export type NoteShouldSpawnEventType = ReturnType<typeof NoteShouldSpawnEvent>;

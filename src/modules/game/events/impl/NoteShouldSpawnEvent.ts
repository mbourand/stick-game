import type { ParsedNote } from "../../../convert/OsuConverter";

export const NoteShouldSpawnEvent = (parsedNote: ParsedNote) => {
  return {
    get parsedNote() {
      return parsedNote;
    },
  };
};

export type NoteShouldSpawnEventType = ReturnType<typeof NoteShouldSpawnEvent>;

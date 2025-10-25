import type { BaseNote } from "../../note/Note";

export const NoteReachedEdgeEvent = (note: BaseNote) => {
  return {
    get note() {
      return note;
    },
  };
};

export type NoteReachedEdgeEventType = ReturnType<typeof NoteReachedEdgeEvent>;

import type { BaseNote } from "../../note/Note";

export const NoteReachedEndOfLifeEvent = (note: BaseNote) => {
  return {
    get note() {
      return note;
    },
  };
};

export type NoteReachedEndOfLifeEventType = ReturnType<typeof NoteReachedEndOfLifeEvent>;

import type { BaseNote } from "../../note/Note";

export const NoteWasJudgedEvent = (note: BaseNote, isNoteTail = false) => {
  return {
    get note() {
      return note;
    },
    get isNoteTail() {
      return isNoteTail;
    },
  };
};

export type NoteWasJudgedEventType = ReturnType<typeof NoteWasJudgedEvent>;

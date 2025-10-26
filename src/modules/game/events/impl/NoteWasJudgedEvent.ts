import type { BaseNote } from "../../note/Note";

export const NoteWasJudgedEvent = (note: BaseNote) => {
  return {
    get note() {
      return note;
    },
  };
};

export type NoteWasJudgedEventType = ReturnType<typeof NoteWasJudgedEvent>;

import type { HoldNote } from "../../note/HoldNote";

export const NoteHoldTickEvent = (note: HoldNote) => {
  return {
    get note() {
      return note;
    },
  };
};

export type NoteHoldTickEventType = ReturnType<typeof NoteHoldTickEvent>;

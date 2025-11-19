import { HoldNote } from "@/modules/game/note/HoldNote";

export const NoteTailWasJudgedEvent = (note: HoldNote) => {
  return {
    get note() {
      return note;
    },
  };
};

export type NoteTailWasJudgedEventType = ReturnType<typeof NoteTailWasJudgedEvent>;

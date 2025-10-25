import type { HoldNote } from "../note/HoldNote";
import type { Note } from "../note/Note";
import { angleInArc } from "../utils/angles";

export const isHittingNote = (stickDotPosition: { x: number; y: number }, note: Note | HoldNote): boolean => {
  const length = Math.sqrt(stickDotPosition.x * stickDotPosition.x + stickDotPosition.y * stickDotPosition.y);
  if (length < 0.75) return false;

  const angle = (Math.atan2(stickDotPosition.y, stickDotPosition.x) + Math.PI * 2) % (Math.PI * 2);
  const startAngle = note.getStartAngle();
  const endAngle = note.getEndAngle();

  return angleInArc(angle, startAngle, endAngle);
};

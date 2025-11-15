import { NoteColor } from "../../game/note/NoteColor";

export type ParsedNote = {
  hitTime: number;
  isHold: boolean;
  holdDuration?: number;
  angle: number;
  color: NoteColor;
  effectiveBPMAtHitTime: number;
};

export type TimingPoint = {
  time: number;
  bpm: number;
  sliderMultiplier: number;
};

export type ParsedMap = {
  title: string;
  artist: string;
  creator: string;
  difficulty: number;
  notes: ParsedNote[];
  backgroundUrl: string;
  backgroundOffsetX: number;
  backgroundOffsetY: number;
  baseSliderMultiplier: number;
  timingPoints: TimingPoint[];
  audioUrl: string;
  mapStartDelayAfterAudioStart: number;
  id: string;
};

const OSU_FIELD_WIDTH = 512;
const OSU_FIELD_HEIGHT = 384;

const OSU_FIELD_CENTER = {
  x: OSU_FIELD_WIDTH / 2,
  y: OSU_FIELD_HEIGHT / 2,
} as const;

const binarySearchEffectiveTimingPoint = (timingPoints: TimingPoint[], time: number): TimingPoint => {
  if (timingPoints.length === 0) {
    throw new Error("No timing points available");
  }

  // If the time is before the first timing point, use the first one
  if (time < timingPoints[0].time) {
    return timingPoints[0];
  }

  let left = 0;
  let right = timingPoints.length - 1;
  let result = timingPoints[0];

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);

    if (timingPoints[mid].time <= time) {
      result = timingPoints[mid];
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
};

const parseHitObjects = (lines: string[], timingPoints: TimingPoint[], baseSliderMultiplier: number): ParsedNote[] => {
  const notes: ParsedNote[] = [];

  for (const line of lines) {
    const parts = line.split(",");
    const x = parseInt(parts[0], 10);
    const y = parseInt(parts[1], 10);

    const angle = Math.atan2(y - OSU_FIELD_CENTER.y, x - OSU_FIELD_CENTER.x);

    const hitTime = parseInt(parts[2], 10);
    const timingPoint = binarySearchEffectiveTimingPoint(timingPoints, hitTime);

    const color = (() => {
      const previousNote = notes.length === 0 ? undefined : notes[notes.length - 1];
      const angleDiff = previousNote ? Math.abs(angle - previousNote.angle) : 0;

      if (!previousNote) return NoteColor.Red;
      if (angleDiff < Math.PI / 9) return previousNote.color;
      return previousNote.color === NoteColor.Red ? NoteColor.Blue : NoteColor.Red;
    })();

    const isHold = (parseInt(parts[3], 10) & 0b10) > 0;
    if (!isHold) {
      notes.push({ hitTime, isHold, angle, color, effectiveBPMAtHitTime: timingPoint.bpm });
      continue;
    }

    const beatLength = 60000 / timingPoint.bpm;
    const length = Number(parts[7]);
    const holdDuration = (length / (baseSliderMultiplier * 100 * timingPoint.sliderMultiplier)) * beatLength;

    notes.push({ hitTime, isHold, holdDuration, angle, color, effectiveBPMAtHitTime: timingPoint.bpm });
  }

  return notes;
};

const parseGeneral = (lines: string[]) => {
  let audioFileName: string | undefined = undefined;
  let audioLeadIn: number | undefined;
  for (const line of lines) {
    const parts = line.split(":");
    const key = parts[0].trim();
    const value = parts[1].trim();
    if (key === "AudioFilename") {
      audioFileName = value;
    } else if (key === "AudioLeadIn") {
      audioLeadIn = parseInt(value, 10);
    }
  }

  if (audioFileName == null || audioLeadIn == null) {
    console.error({ audioFileName, audioLeadIn });
    throw new Error("Invalid osu! map general section");
  }

  return { audioFileName, audioLeadIn };
};

export const parseMetadata = (lines: string[]) => {
  let title: string | undefined = undefined;
  let artist: string | undefined = undefined;
  let creator: string | undefined = undefined;
  let id: string | undefined = undefined;

  for (const line of lines) {
    const parts = line.split(":");
    const key = parts[0].trim();
    const value = parts[1].trim();

    if (key === "Title") title = value;
    else if (key === "Artist") artist = value;
    else if (key === "Creator") creator = value;
    else if (key === "BeatmapID") id = "osu_" + value;
  }

  if (title == null || artist == null || creator == null || id == null) {
    throw new Error("Invalid osu! map metadata section");
  }

  return { title, artist, creator, id };
};

export const parseDifficulty = (lines: string[]) => {
  let baseSliderMultiplier: number | undefined = undefined;
  for (const line of lines) {
    const parts = line.split(":");
    const key = parts[0].trim();
    const value = parts[1].trim();
    if (key === "SliderMultiplier") {
      baseSliderMultiplier = parseFloat(value);
    }
  }

  if (baseSliderMultiplier == null) {
    throw new Error("Invalid osu! map difficulty section");
  }

  return { baseSliderMultiplier };
};

const parseTimingPoints = (lines: string[]) => {
  const timingPoints: TimingPoint[] = [];

  let lastBpm: number | undefined = undefined;

  for (const line of lines) {
    const parts = line.split(",");

    const isInherited = parseInt(parts[6], 10) === 0;

    const time = parseInt(parts[0], 10);
    if (!isInherited) {
      const beatLength = parseFloat(parts[1]);
      const bpm = beatLength > 0 ? 60000 / beatLength : 0;
      timingPoints.push({ time, bpm, sliderMultiplier: 1 });
      lastBpm = bpm;
    } else {
      const svMultiplier = -100 / parseFloat(parts[1]);

      if (lastBpm) {
        timingPoints.push({
          time,
          bpm: lastBpm,
          sliderMultiplier: svMultiplier,
        });
      } else {
        throw new Error("Invalid osu! map timing points section: started with inherited point");
      }
    }
  }

  return timingPoints;
};

const parseEventLines = (lines: string[]) => {
  let backgroundFilePath: string | undefined = undefined;

  for (const line of lines) {
    const parts = line.split(",");
    const type = parts[0].trim();

    if (type === "0") {
      const backgroundFileName = parts[2].replaceAll('"', "").trim();
      backgroundFilePath = backgroundFileName;
    }
  }

  if (!backgroundFilePath) {
    throw new Error("Invalid osu! map events section: no background found");
  }

  return { backgroundFilePath };
};

const computeDifficultyRating = (notes: ParsedNote[]): number => {
  const diffData = {
    [NoteColor.Red]: {
      currentAngle: 0,
      currentHitTime: 0,
    },
    [NoteColor.Blue]: {
      currentAngle: 0,
      currentHitTime: 0,
    },
  };

  let speedValuesSum = 0;

  for (const note of notes) {
    const hand = diffData[note.color];
    const toAngle = note.angle;
    const angleDiff = Math.abs(toAngle - hand.currentAngle);
    speedValuesSum += angleDiff / Math.max(1, note.hitTime - hand.currentHitTime);
    hand.currentHitTime = note.hitTime + (note.holdDuration ?? 0);
    hand.currentAngle = toAngle;
  }

  return Math.round((speedValuesSum / notes.length) * 100000) / 100;
};

export const convertFromOsu = (
  mapContent: string,
  makeAbsoluteUrlFromRelativePath: (path: string) => string,
): ParsedMap => {
  const lines = mapContent
    .split("\n")
    .map((line) => line.trim().replaceAll("\r", ""))
    .filter((line) => line.length > 0);

  const categoryLineIndices = lines.map((line, i) => (/^\[.+\]$/.test(line.trim()) ? i : -1)).filter((i) => i !== -1);

  let audioLeadIn: number | undefined = undefined;
  let audioRelativePath: string | undefined = undefined;
  let notes: ParsedNote[] | undefined = undefined;
  let title: string | undefined = undefined;
  let artist: string | undefined = undefined;
  let creator: string | undefined = undefined;
  let baseSliderMultiplier: number | undefined = undefined;
  let timingPoints: TimingPoint[] | undefined = undefined;
  let backgroundRelativePath: string | undefined = undefined;
  let id: string | undefined = undefined;

  for (let i = 0; i < categoryLineIndices.length; i++) {
    const categoryLine = lines[categoryLineIndices[i]].trim();

    if (categoryLine === "[General]") {
      const nextCategoryLine = i + 1 < categoryLineIndices.length ? categoryLineIndices[i + 1] : lines.length;
      const generalLines = lines.slice(categoryLineIndices[i] + 1, nextCategoryLine);
      const generalResult = parseGeneral(generalLines);
      audioRelativePath = generalResult.audioFileName;
      audioLeadIn = generalResult.audioLeadIn;
      continue;
    }

    if (categoryLine === "[Metadata]") {
      const nextCategoryLine = i + 1 < categoryLineIndices.length ? categoryLineIndices[i + 1] : lines.length;
      const metadataLines = lines.slice(categoryLineIndices[i] + 1, nextCategoryLine);
      const metadataResult = parseMetadata(metadataLines);
      title = metadataResult.title;
      artist = metadataResult.artist;
      creator = metadataResult.creator;
      id = metadataResult.id;
      continue;
    }

    if (categoryLine === "[HitObjects]") {
      if (timingPoints == null || baseSliderMultiplier == null) {
        throw new Error("Timing points and difficulty must be parsed before hit objects");
      }

      const nextCategoryLine = i + 1 < categoryLineIndices.length ? categoryLineIndices[i + 1] : lines.length;
      const hitObjectLines = lines.slice(categoryLineIndices[i] + 1, nextCategoryLine);
      notes = parseHitObjects(hitObjectLines, timingPoints, baseSliderMultiplier);
      continue;
    }

    if (categoryLine === "[Difficulty]") {
      const nextCategoryLine = i + 1 < categoryLineIndices.length ? categoryLineIndices[i + 1] : lines.length;
      const difficultyLines = lines.slice(categoryLineIndices[i] + 1, nextCategoryLine);
      const difficultyResult = parseDifficulty(difficultyLines);
      baseSliderMultiplier = difficultyResult.baseSliderMultiplier;
      continue;
    }

    if (categoryLine === "[TimingPoints]") {
      const nextCategoryLine = i + 1 < categoryLineIndices.length ? categoryLineIndices[i + 1] : lines.length;
      const timingPointLines = lines.slice(categoryLineIndices[i] + 1, nextCategoryLine);
      timingPoints = parseTimingPoints(timingPointLines);
      continue;
    }

    if (categoryLine === "[Events]") {
      const nextCategoryLine = i + 1 < categoryLineIndices.length ? categoryLineIndices[i + 1] : lines.length;
      const eventLines = lines.slice(categoryLineIndices[i] + 1, nextCategoryLine);
      const eventResult = parseEventLines(eventLines);
      backgroundRelativePath = eventResult.backgroundFilePath;
      continue;
    }
  }

  if (
    audioRelativePath == null ||
    audioLeadIn == null ||
    notes == null ||
    title == null ||
    artist == null ||
    creator == null ||
    baseSliderMultiplier == null ||
    timingPoints == null ||
    timingPoints.length === 0 ||
    notes == null ||
    notes.length === 0 ||
    backgroundRelativePath == null ||
    id == null
  ) {
    console.error({
      audioFileName: audioRelativePath,
      audioLeadIn,
      notes,
      title,
      baseSliderMultiplier,
      timingPoints,
      backgroundUrl: backgroundRelativePath,
      id,
    });
    throw new Error("Invalid osu! map file");
  }

  return {
    title,
    artist,
    creator,
    difficulty: computeDifficultyRating(notes),
    audioUrl: makeAbsoluteUrlFromRelativePath(audioRelativePath),
    mapStartDelayAfterAudioStart: audioLeadIn,
    notes,
    backgroundUrl: makeAbsoluteUrlFromRelativePath(backgroundRelativePath),
    backgroundOffsetX: 0,
    backgroundOffsetY: 0,
    baseSliderMultiplier,
    timingPoints,
    id,
  };
};

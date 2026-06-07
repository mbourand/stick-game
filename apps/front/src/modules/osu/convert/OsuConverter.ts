import { NoteColor } from "../../game/note/NoteColor";

export type ParsedNote = {
  hitTime: number;
  isHold: boolean;
  holdDuration?: number;
  holdTicksHitTimes?: number[];
  angle: number;
  /** Angular width of the note arc, in radians. Computed deterministically at
   * conversion time (seeded RNG) so a map plays identically every run. */
  angleSpan: number;
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
  /** Playable length in ms (song-time): the last note's end. Drives the in-game progress arc and the selection-menu length badge. */
  durationMs: number;
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

// Deterministic PRNG (mulberry32) so note arc widths are stable across plays of
// the same map instead of being re-randomised every run.
const makeRng = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Stable 32-bit string hash (FNV-1a) used to seed the per-map RNG.
const hashString = (str: string): number => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

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

  // Seed from a cheap, stable fingerprint of the hit objects (count + first/last
  // line) so the arc widths are deterministic per map (same .osu -> same spans)
  // yet vary naturally from note to note — no need to hash the whole blob.
  const rng = makeRng(hashString(`${lines.length}:${lines[0]}:${lines[lines.length - 1]}`));

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

    // Matches the old play-time formula, now driven by the seeded RNG.
    const angleSpan = Math.max((rng() * Math.PI) / 3, Math.PI / 5);

    const isHold = (parseInt(parts[3], 10) & 0b10) > 0;
    if (!isHold) {
      notes.push({ hitTime, isHold, angle, angleSpan, color, effectiveBPMAtHitTime: timingPoint.bpm });
      continue;
    }

    const beatLength = 60000 / timingPoint.bpm;
    const length = Number(parts[7]);

    const holdDuration = (length / (baseSliderMultiplier * 100 * timingPoint.sliderMultiplier)) * beatLength;
    const timeBetweenHoldTicks = beatLength / 2;
    const holdTicksCount = Math.floor((holdDuration - timeBetweenHoldTicks / 2) / timeBetweenHoldTicks);
    const holdTicksHitTimes = Array.from(
      { length: holdTicksCount },
      (_, i) => hitTime + (i + 1) * timeBetweenHoldTicks,
    );

    notes.push({
      hitTime,
      isHold,
      holdDuration,
      angle,
      angleSpan,
      color,
      effectiveBPMAtHitTime: timingPoint.bpm,
      holdTicksHitTimes,
    });
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
    } else if (key === "Mode") {
      const mode = parseInt(value, 10);
      if (mode !== 0) {
        throw new Error("Only osu!standard mode (0) is supported");
      }
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

  console.log(backgroundFilePath);

  if (!backgroundFilePath) {
    throw new Error("Invalid osu! map events section: no background found");
  }

  return { backgroundFilePath };
};

// How much a change in angular velocity (acceleration) weighs relative to raw
// speed. A full direction reversal at the same speed roughly doubles the strain.
const ACCELERATION_WEIGHT = 0.6;

// Global scale that keeps the new (speed + acceleration) rating on the same
// numeric scale as the old (speed-only) one. Calibrated so the average new/old
// ratio across the bundled default maps was ~1: the acceleration term
// redistributes difficulty (variable/tech maps up, steady streams down)
// without inflating every number. If ACCELERATION_WEIGHT changes, this needs
// re-deriving (= 1 / average(new/old) over a representative map set).
const DIFFICULTY_CALIBRATION = 0.8093;

const computeDifficultyRating = (notes: ParsedNote[]): number => {
  // Each stick (hand) is modelled independently. For every note we look at the
  // angular motion the stick has to perform to reach it:
  //   - speed: how fast it must rotate (this was the whole rating before).
  //   - acceleration: how much that angular velocity changes from the previous
  //     move. This single term captures BOTH speed variation (same direction,
  //     slowing down / speeding up) AND direction changes (the velocity sign
  //     flips, so the delta becomes |v| + |v_prev| — large). Both are much
  //     harder than a steady stream, which is exactly what we want to reward.
  const diffData = {
    [NoteColor.Red]: {
      currentAngle: 0,
      currentHitTime: 0,
      lastVelocity: undefined as number | undefined,
    },
    [NoteColor.Blue]: {
      currentAngle: 0,
      currentHitTime: 0,
      lastVelocity: undefined as number | undefined,
    },
  };

  let strainSum = 0;

  for (const note of notes) {
    const hand = diffData[note.color];

    // Shortest signed rotation from the current stick angle to the note's
    // angle (normalised to [-PI, PI]). The sign encodes the rotation direction.
    const rawDelta = note.angle - hand.currentAngle;
    const angleDelta = Math.atan2(Math.sin(rawDelta), Math.cos(rawDelta));

    const dt = Math.max(1, note.hitTime - hand.currentHitTime);
    const velocity = angleDelta / dt;

    const speedStrain = Math.abs(velocity);
    const accelerationStrain = hand.lastVelocity === undefined ? 0 : Math.abs(velocity - hand.lastVelocity);

    strainSum += speedStrain + ACCELERATION_WEIGHT * accelerationStrain;

    hand.currentHitTime = note.hitTime + (note.holdDuration ?? 0);
    hand.currentAngle = note.angle;
    hand.lastVelocity = velocity;
  }

  return Math.round((strainSum / notes.length) * DIFFICULTY_CALIBRATION * 100000) / 100;
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

  // Playable length = the final note's end (notes are validated non-empty above).
  const lastNote = notes[notes.length - 1];
  const durationMs = lastNote.hitTime + (lastNote.holdDuration ?? 0);

  return {
    title,
    artist,
    creator,
    difficulty: computeDifficultyRating(notes),
    audioUrl: makeAbsoluteUrlFromRelativePath(audioRelativePath),
    mapStartDelayAfterAudioStart: audioLeadIn,
    notes,
    durationMs,
    backgroundUrl: makeAbsoluteUrlFromRelativePath(backgroundRelativePath),
    backgroundOffsetX: 0,
    backgroundOffsetY: 0,
    baseSliderMultiplier,
    timingPoints,
    id,
  };
};

/* See: https://github.com/ppy/osu/wiki/Legacy-database-file-structure */

export type OsuDBBeatmapType = {
  beatmapSize: number | null; // Int | absent
  artistName: string; // String
  __unused_artistNameUnicode: string; // String
  songTitle: string; // String
  __unused_songTitleUnicode: string; // String
  creatorName: string; // String
  difficultyName: string; // String
  audioFilename: string; // String
  __unused_md5Hash: string; // String
  osuFilename: string; // String
  __unused_rankedStatus: number; // Byte
  __unused_numberOfHitCircles: number; // Short
  __unused_numberOfSliders: number; // Short
  __unused_numberOfSpinners: number; // Short
  __unused_lastModificationTime: number; // Long
  __unused_approachRate: number; // Single | Byte
  __unused_circleSize: number; // Single | Byte
  __unused_hpDrainRate: number; // Single | Byte
  __unused_overallDifficulty: number; // Single | Byte
  __unused_sliderVelocity: number; // Double
  __unused_standardStarRatingPairCount: number | null; // Int | absent
  __unused_standardStarRatingPairs: [number, number][] | null; // Pair<Int, Double[]> | Pair<Int, Float[]> | absent
  __unused_taikoStarRatingPairCount: number | null; // Int | absent
  __unused_taikoStarRatingPairs: [number, number][] | null; // Pair<Int, Double[]> | Pair<Int, Float[]> | absent
  __unused_ctbStarRatingPairCount: number | null; // Int | absent
  __unused_ctbStarRatingPairs: [number, number][] | null; // Pair<Int, Double[]> | Pair<Int, Float[]> | absent
  __unused_maniaStarRatingPairCount: number | null; // Int | absent
  __unused_maniaStarRatingPairs: [number, number][] | null; // Pair<Int, Double[]> | Pair<Int, Float[]> | absent
  __unused_drainTime: number; // Int
  __unused_totalTime: number; // Int
  __unused_previewTime: number; // Int
  __unused_timingPointCount: number; // Int
  __unused_timingPoints: unknown; // TimingPoint[], just skipping it when parsing for now
  __unused_difficultyId: number; // Int
  __unused_beatmapId: number; // Int
  __unused_threadId: number; // Int
  __unused_standardGrade: number; // Byte
  __unused_taikoGrade: number; // Byte
  __unused_ctbGrade: number; // Byte
  __unused_maniaGrade: number; // Byte
  __unused_localOffset: number; // Short
  __unused_stackLeniency: number; // Single
  gameplayMode: number; // Byte
  __unused_songSource: string; // String
  __unused_songTags: string; // String
  __unused_onlineOffset: number; // Short
  __unused_usedTitleFont: string; // String
  __unused_isBeatmapUnplayed: boolean; // Byte
  __unused_lastTimePlayed: number; // Long
  __unused_isOsz2Beatmap: boolean; // Boolean
  folderName: string; // String
  __unused_lastSyncTime: number; // Long
  __unused_ignoreBeatmapSound: boolean; // Boolean
  __unused_ignoreBeatmapSkin: boolean; // Boolean
  __unused_disableStoryboard: boolean; // Boolean
  __unused_disableVideo: boolean; // Boolean
  __unused_visualOverride: boolean; // Boolean
  __unused_unknownShort: number | null; // Short | absent
  __unused_lastModificationTime2_do_not_use: number; // Int
  __unused_maniaScrollSpeed: number; // Byte
};

export type OsuDBType = {
  __unused_version: number; // Int
  __unused_folderCount: number; // Int
  __unused_accountUnlocked: boolean; // Boolean
  __unused_accountUnlockedDate: number; // Long
  __unused_playerName: string; // String
  numberOfBeatmaps: number; // Int
  beatmaps: OsuDBBeatmapType[];
  __unused_userPermissions: number; // Int
};

export const TIMING_POINT_SIZE = 17;

export class OsuDBParser {
  private buffer: Uint8Array;
  private offset: number = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
  }

  public parseOsuDBData(options?: { onBeatmapParsed?: (index: number, numberOfBeatmaps: number) => void }): OsuDBType {
    const { onBeatmapParsed } = options || {};

    console.log("Parsing osu!db...");
    const version = this.readInt();
    console.log(`Osu!db version: ${version}`);

    let numberOfBeatmaps = 0;

    return {
      __unused_version: version,
      __unused_folderCount: this.readInt(),
      __unused_accountUnlocked: this.readBoolean(),
      __unused_accountUnlockedDate: this.readLong(),
      __unused_playerName: this.readString(),
      numberOfBeatmaps: (numberOfBeatmaps = this.readInt()),
      beatmaps: this.readBeatmaps(version, numberOfBeatmaps, onBeatmapParsed),
      __unused_userPermissions: this.readInt(),
    };
  }

  private readBeatmaps(
    version: number,
    numberOfBeatmaps: number,
    onBeatmapParsed?: (index: number, numberOfBeatmaps: number) => void,
  ): OsuDBBeatmapType[] {
    const beatmaps: OsuDBBeatmapType[] = [];
    for (let i = 0; i < numberOfBeatmaps; i++) {
      beatmaps.push(this.readBeatmap(version));
      onBeatmapParsed?.(i, numberOfBeatmaps);
    }
    return beatmaps;
  }

  private readBeatmap(version: number): OsuDBBeatmapType {
    let timingPointsCount = 0;

    let standardStarRatingPairCount: number | null = null;
    let taikoStarRatingPairCount: number | null = null;
    let ctbStarRatingPairCount: number | null = null;
    let maniaStarRatingPairCount: number | null = null;

    return {
      beatmapSize: version < 20191106 ? this.readInt() : null,
      artistName: this.readString(),
      __unused_artistNameUnicode: this.readString(),
      songTitle: this.readString(),
      __unused_songTitleUnicode: this.readString(),
      creatorName: this.readString(),
      difficultyName: this.readString(),
      audioFilename: this.readString(),
      __unused_md5Hash: this.readString(),
      osuFilename: this.readString(),
      __unused_rankedStatus: this.readByte(),
      __unused_numberOfHitCircles: this.readShort(),
      __unused_numberOfSliders: this.readShort(),
      __unused_numberOfSpinners: this.readShort(),
      __unused_lastModificationTime: this.readLong(),
      __unused_approachRate: version < 20140609 ? this.readByte() : this.readSingle(),
      __unused_circleSize: version < 20140609 ? this.readByte() : this.readSingle(),
      __unused_hpDrainRate: version < 20140609 ? this.readByte() : this.readSingle(),
      __unused_overallDifficulty: version < 20140609 ? this.readByte() : this.readSingle(),
      __unused_sliderVelocity: this.readDouble(),
      __unused_standardStarRatingPairCount: (standardStarRatingPairCount = version >= 20140609 ? this.readInt() : null),
      __unused_standardStarRatingPairs: this.parseStarRatingPairs(standardStarRatingPairCount, version),
      __unused_taikoStarRatingPairCount: (taikoStarRatingPairCount = version >= 20140609 ? this.readInt() : null),
      __unused_taikoStarRatingPairs: this.parseStarRatingPairs(taikoStarRatingPairCount, version),
      __unused_ctbStarRatingPairCount: (ctbStarRatingPairCount = version >= 20140609 ? this.readInt() : null),
      __unused_ctbStarRatingPairs: this.parseStarRatingPairs(ctbStarRatingPairCount, version),
      __unused_maniaStarRatingPairCount: (maniaStarRatingPairCount = version >= 20140609 ? this.readInt() : null),
      __unused_maniaStarRatingPairs: this.parseStarRatingPairs(maniaStarRatingPairCount, version),
      __unused_drainTime: this.readInt(),
      __unused_totalTime: this.readInt(),
      __unused_previewTime: this.readInt(),
      __unused_timingPointCount: (timingPointsCount = this.readInt()),
      __unused_timingPoints: this.skip(timingPointsCount * TIMING_POINT_SIZE), // TimingPoint[], just skipping it when parsing for now
      __unused_difficultyId: this.readInt(),
      __unused_beatmapId: this.readInt(),
      __unused_threadId: this.readInt(),
      __unused_standardGrade: this.readByte(),
      __unused_taikoGrade: this.readByte(),
      __unused_ctbGrade: this.readByte(),
      __unused_maniaGrade: this.readByte(),
      __unused_localOffset: this.readShort(),
      __unused_stackLeniency: this.readSingle(),
      gameplayMode: this.readByte(),
      __unused_songSource: this.readString(),
      __unused_songTags: this.readString(),
      __unused_onlineOffset: this.readShort(),
      __unused_usedTitleFont: this.readString(),
      __unused_isBeatmapUnplayed: this.readBoolean(),
      __unused_lastTimePlayed: this.readLong(),
      __unused_isOsz2Beatmap: this.readBoolean(),
      folderName: this.readString(),
      __unused_lastSyncTime: this.readLong(),
      __unused_ignoreBeatmapSound: this.readBoolean(),
      __unused_ignoreBeatmapSkin: this.readBoolean(),
      __unused_disableStoryboard: this.readBoolean(),
      __unused_disableVideo: this.readBoolean(),
      __unused_visualOverride: this.readBoolean(),
      __unused_unknownShort: version < 20140609 ? this.readShort() : null,
      __unused_lastModificationTime2_do_not_use: this.readInt(),
      __unused_maniaScrollSpeed: this.readByte(),
    };
  }

  private parseStarRatingPairs(count: number | null, version: number): [number, number][] | null {
    if (version < 20140609 || !count) return null;

    return Array.from({ length: count }, () => {
      this.readByte(); // Unused byte
      const mode = this.readInt();
      this.readByte(); // Unused byte
      const starRating = version < 20250107 ? this.readDouble() : this.readSingle();
      return [mode, starRating];
    });
  }

  private skip(length: number) {
    this.offset += length;
    return null;
  }

  private readByte() {
    const value = this.buffer[this.offset];
    this.offset += 1;
    return value;
  }

  private readShort() {
    const value = (this.buffer[this.offset + 1] << 8) | this.buffer[this.offset];
    this.offset += 2;
    return value;
  }

  private readInt() {
    const value =
      (this.buffer[this.offset + 3] << 24) |
      (this.buffer[this.offset + 2] << 16) |
      (this.buffer[this.offset + 1] << 8) |
      this.buffer[this.offset];
    this.offset += 4;
    return value;
  }

  private readLong() {
    const low = this.readInt();
    const high = this.readInt();
    return high * 0x100000000 + low;
  }

  private readULEB128() {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = this.readByte();
      result |= (byte & 0x7f) << shift;
      shift += 7;
    } while (byte & 0x80);
    return result;
  }

  private readSingle() {
    const buffer = this.buffer.slice(this.offset, this.offset + 4);
    this.offset += 4;
    return new Float32Array(buffer.buffer)[0];
  }

  private readDouble() {
    const buffer = this.buffer.slice(this.offset, this.offset + 8);
    this.offset += 8;
    return new Float64Array(buffer.buffer)[0];
  }

  private readBoolean() {
    const value = this.buffer[this.offset];
    this.offset += 1;
    return value !== 0;
  }

  private readString() {
    const isPresent = this.readByte();
    if (isPresent === 0x00) return "";
    const length = this.readULEB128();
    const value = new TextDecoder().decode(this.buffer.slice(this.offset, this.offset + length));
    this.offset += length;
    return value;
  }
}

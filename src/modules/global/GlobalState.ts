import { EventManager } from "../game/events/EventManager";

export type BeatmapMetadata = {
  title: string;
  artist: string;
};

export class GlobalState {
  private static eventManager = new EventManager();

  private static songsFiles: Map<string, File> = new Map();
  private static importedBeatmaps: BeatmapMetadata[] = [];

  public static getEventManager() {
    return GlobalState.eventManager;
  }

  public static getSongsFiles() {
    return GlobalState.songsFiles;
  }

  public static setSongsFiles(songsFiles: Map<string, File>) {
    GlobalState.songsFiles = songsFiles;
  }

  public static getImportedBeatmaps() {
    return GlobalState.importedBeatmaps;
  }

  public static setBeatmaps(beatmaps: BeatmapMetadata[]) {
    GlobalState.importedBeatmaps = beatmaps;
  }
}

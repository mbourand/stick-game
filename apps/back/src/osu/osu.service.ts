import { Injectable } from "@nestjs/common";
import { OsuHttpService } from "./osu.http.service";
import z from "zod";
import { BeatmapSetSchema } from "./osu.schemas";

@Injectable()
export class OsuService {
  constructor(private readonly osuHttpService: OsuHttpService) {}

  async searchBeatmapsets(query: string) {
    const sanitizedQuery = encodeURIComponent(query);
    const data = await this.osuHttpService.get(
      `/beatmapsets/search?s=any&m=0&q=${sanitizedQuery}`,
      z.object({ beatmapsets: z.array(BeatmapSetSchema) }),
    );

    return data;
  }
}

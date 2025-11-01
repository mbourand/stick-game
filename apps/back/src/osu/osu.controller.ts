import { Controller, Get, Query } from "@nestjs/common";
import { OsuService } from "./osu.service";
import { BeatmapsetsSearchQueryParamsDto, BeatmapsetsSearchResponseDto } from "./dto/beatmapsets-search.dto";
import { ZodResponse } from "nestjs-zod";

@Controller("osu")
export class OsuController {
  constructor(private readonly osuService: OsuService) {}

  @Get("beatmapsets/search")
  @ZodResponse({ type: BeatmapsetsSearchResponseDto })
  async beatmapsetsSearch(@Query() query: BeatmapsetsSearchQueryParamsDto) {
    return this.osuService.searchBeatmapsets(query.q);
  }
}

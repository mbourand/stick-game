import { Controller, Get, Query } from "@nestjs/common";
import { OsuService } from "./osu.service";
import {
  GetOsuBeatmapsetsSearchQueryParamsDto,
  GetOsuBeatmapsetsSearchResponseDto,
} from "./dto/routes/get-osu-beatmapsets-search.dto";
import { ZodResponse } from "nestjs-zod";

@Controller("osu")
export class OsuController {
  constructor(private readonly osuService: OsuService) {}

  @Get("beatmapsets/search")
  @ZodResponse({ type: GetOsuBeatmapsetsSearchResponseDto })
  async beatmapsetsSearch(@Query() query: GetOsuBeatmapsetsSearchQueryParamsDto) {
    return this.osuService.searchBeatmapsets(query.q);
  }
}

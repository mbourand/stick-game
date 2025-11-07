import { Body, Controller, Get, HttpException, Param, Post } from "@nestjs/common";
import { ScoresService } from "./scores.service";
import { PostScoreSubmitBodyDto, PostScoreSubmitResponseDto } from "./dto/routes/post-score-submit.dto";
import { ZodResponse } from "nestjs-zod";
import {
  GetScoreBeatmapLeaderboardParamsDto,
  GetScoreBeatmapLeaderboardResponseDto,
} from "./dto/routes/get-score-beatmap-leaderboard.dto";
import {
  GetScoreBeatmapPersonalBestParamsDto,
  GetScoreBeatmapPersonalBestResponseDto,
} from "./dto/routes/get-score-beatmap-personal-best.dto";
import { HttpStatusCode } from "axios";

@Controller("scores")
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Get(":beatmapId/leaderboard")
  @ZodResponse({ type: GetScoreBeatmapLeaderboardResponseDto })
  async getBeatmapLeaderboard(@Param() params: GetScoreBeatmapLeaderboardParamsDto) {
    return { leaderboard: await this.scores.getBeatmapLeaderboard(params.beatmapId) };
  }

  @Get(":beatmapId/personal-best/:playerName")
  @ZodResponse({ type: GetScoreBeatmapPersonalBestResponseDto })
  async getBeatmapPersonalBest(@Param() params: GetScoreBeatmapPersonalBestParamsDto) {
    const result = await this.scores.getBeatmapPersonalBest(params.beatmapId, params.playerName);
    if (!result) {
      throw new HttpException("Personal best not found", HttpStatusCode.NotFound);
    }

    return result;
  }

  @Post("/submit")
  @ZodResponse({ type: PostScoreSubmitResponseDto })
  async submitScore(@Body() scoreDto: PostScoreSubmitBodyDto) {
    return this.scores.submitScore(scoreDto);
  }
}

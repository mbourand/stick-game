import { Body, Controller, Get, HttpException, Param, Post, Query } from "@nestjs/common";
import { ScoresService } from "./scores.service";
import { ZodResponse } from "nestjs-zod";
import { HttpStatusCode } from "axios";
import {
  GetScoresBeatmapLeaderboardParamsDto,
  GetScoresBeatmapLeaderboardQueryParamsDto,
  GetScoresBeatmapLeaderboardResponseDto,
} from "./dto/routes/get-scores-beatmap-leaderboard.dto";
import {
  GetScoresBeatmapPersonalBestParamsDto,
  GetScoresBeatmapPersonalBestQueryParamsDto,
  GetScoresBeatmapPersonalBestResponseDto,
} from "./dto/routes/get-scores-beatmap-personal-best.dto";
import { PostScoresSubmitBodyDto, PostScoresSubmitResponseDto } from "./dto/routes/post-scores-submit.dto";
import { ScoreSchemas } from "../prisma/dto/score.dto";
import { User } from "../auth/user.decorator";
import { type RawUserType } from "../prisma/dto/user.dto";

@Controller("scores")
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Get(":beatmapId/leaderboard")
  @ZodResponse({ type: GetScoresBeatmapLeaderboardResponseDto })
  async getBeatmapLeaderboard(
    @Param() params: GetScoresBeatmapLeaderboardParamsDto,
    @Query() query: GetScoresBeatmapLeaderboardQueryParamsDto,
  ) {
    const leaderboard = await this.scores.getBeatmapLeaderboard(params.beatmapId, query.scoreVersion);
    return { leaderboard: leaderboard.map((score) => ScoreSchemas.serializePublic(score)) };
  }

  @Get(":beatmapId/personal-best/:playerId")
  @ZodResponse({ type: GetScoresBeatmapPersonalBestResponseDto })
  async getBeatmapPersonalBest(
    @Param() params: GetScoresBeatmapPersonalBestParamsDto,
    @Query() query: GetScoresBeatmapPersonalBestQueryParamsDto,
  ) {
    const result = await this.scores.getBeatmapPersonalBest(params.beatmapId, params.playerId, query.scoreVersion);
    if (!result) throw new HttpException("Personal best not found", HttpStatusCode.NotFound);

    return ScoreSchemas.serializePublic(result);
  }

  @Post("submit")
  @ZodResponse({ type: PostScoresSubmitResponseDto })
  async submitScore(@Body() body: PostScoresSubmitBodyDto, @User() user: RawUserType) {
    const result = await this.scores.submitScore(body, user);
    return {
      wasUploaded: result.wasUploaded,
      score: ScoreSchemas.serializePublic(result.score),
    };
  }
}

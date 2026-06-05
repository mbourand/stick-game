import { Body, Controller, Get, HttpException, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ScoresService } from "./scores.service";
import { ZodResponse } from "nestjs-zod";
import { HttpStatusCode } from "axios";
import { AuthUser, CurrentUser } from "../auth/auth-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { toSelfScore } from "../prisma/dto/score.dto";
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

@Controller("scores")
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Get(":beatmapId/leaderboard")
  @ZodResponse({ type: GetScoresBeatmapLeaderboardResponseDto })
  async getBeatmapLeaderboard(
    @Param() params: GetScoresBeatmapLeaderboardParamsDto,
    @Query() query: GetScoresBeatmapLeaderboardQueryParamsDto,
  ) {
    const leaderboard = await this.scores.getBeatmapLeaderboard(params.beatmapId, query.scoreVersion, query.modded);
    return { leaderboard };
  }

  @Get(":beatmapId/personal-best")
  @UseGuards(JwtAuthGuard)
  @ZodResponse({ type: GetScoresBeatmapPersonalBestResponseDto })
  async getBeatmapPersonalBest(
    @CurrentUser() current: AuthUser,
    @Param() params: GetScoresBeatmapPersonalBestParamsDto,
    @Query() query: GetScoresBeatmapPersonalBestQueryParamsDto,
  ) {
    const result = await this.scores.getBeatmapPersonalBest(
      params.beatmapId,
      current.id,
      query.scoreVersion,
      query.modded,
    );
    if (!result) {
      throw new HttpException("Personal best not found", HttpStatusCode.NotFound);
    }

    return toSelfScore(result, current.username);
  }

  @Post("submit")
  @UseGuards(JwtAuthGuard)
  @ZodResponse({ type: PostScoresSubmitResponseDto })
  async submitScore(@CurrentUser() current: AuthUser, @Body() scoreDto: PostScoresSubmitBodyDto) {
    const result = await this.scores.submitScore(current.id, current.username, scoreDto);
    return {
      wasUploaded: result.wasUploaded,
      score: toSelfScore(result.score, current.username),
    };
  }
}

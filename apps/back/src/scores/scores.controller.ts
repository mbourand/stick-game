import { Body, Controller, Get, HttpException, Param, Post, Query } from "@nestjs/common";
import { ScoresService } from "./scores.service";
import { ZodResponse } from "nestjs-zod";
import { HttpStatusCode } from "axios";
import { toResponseScore } from "../prisma/dto/score.dto";
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
    const leaderboard = await this.scores.getBeatmapLeaderboard(
      params.beatmapId,
      query.scoreVersion,
      query.modded,
    );
    return {
      leaderboard: leaderboard.map(toResponseScore),
    };
  }

  @Get(":beatmapId/personal-best/:playerName")
  @ZodResponse({ type: GetScoresBeatmapPersonalBestResponseDto })
  async getBeatmapPersonalBest(
    @Param() params: GetScoresBeatmapPersonalBestParamsDto,
    @Query() query: GetScoresBeatmapPersonalBestQueryParamsDto,
  ) {
    const result = await this.scores.getBeatmapPersonalBest(
      params.beatmapId,
      params.playerName,
      query.scoreVersion,
      query.modded,
    );
    if (!result) {
      throw new HttpException("Personal best not found", HttpStatusCode.NotFound);
    }

    return toResponseScore(result);
  }

  @Post("submit")
  @ZodResponse({ type: PostScoresSubmitResponseDto })
  async submitScore(@Body() scoreDto: PostScoresSubmitBodyDto) {
    const result = await this.scores.submitScore(scoreDto);
    return {
      wasUploaded: result.wasUploaded,
      score: toResponseScore(result.score),
    };
  }
}

import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ZodResponse } from "nestjs-zod";
import { AuthUser, CurrentUser } from "../auth/auth-user";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { LeaderboardsService } from "./leaderboards.service";
import {
  GetLeaderboardsPlayersQueryParamsDto,
  GetLeaderboardsPlayersResponseDto,
} from "./dto/routes/get-leaderboards-players.dto";
import {
  GetLeaderboardsPlayersMeQueryParamsDto,
  GetLeaderboardsPlayersMeResponseDto,
} from "./dto/routes/get-leaderboards-players-me.dto";

@Controller("leaderboards")
export class LeaderboardsController {
  constructor(private readonly leaderboards: LeaderboardsService) {}

  @Get("players")
  @ZodResponse({ type: GetLeaderboardsPlayersResponseDto })
  getPlayerRankings(@Query() query: GetLeaderboardsPlayersQueryParamsDto) {
    return this.leaderboards.getPlayerRankings(query.metric, query.limit, query.offset);
  }

  @Get("players/me")
  @UseGuards(JwtAuthGuard)
  @ZodResponse({ type: GetLeaderboardsPlayersMeResponseDto })
  getMyPlayerRank(@CurrentUser() current: AuthUser, @Query() query: GetLeaderboardsPlayersMeQueryParamsDto) {
    return this.leaderboards.getPlayerRank(query.metric, current.id);
  }
}

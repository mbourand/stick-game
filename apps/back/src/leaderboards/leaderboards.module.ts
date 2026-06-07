import { Module } from "@nestjs/common";
import { LeaderboardsController } from "./leaderboards.controller";
import { LeaderboardsService } from "./leaderboards.service";
import { LeaderboardStatsRefresher } from "./leaderboard-stats.refresher";

@Module({
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService, LeaderboardStatsRefresher],
  // ScoresModule flags the view dirty after each submit.
  exports: [LeaderboardStatsRefresher],
})
export class LeaderboardsModule {}

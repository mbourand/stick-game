import { Module } from "@nestjs/common";
import { ScoresController } from "./scores.controller";
import { ScoresService } from "./scores.service";
import { LeaderboardsModule } from "../leaderboards/leaderboards.module";

@Module({
  // For LeaderboardStatsRefresher — submits flag the player boards stale.
  imports: [LeaderboardsModule],
  controllers: [ScoresController],
  providers: [ScoresService],
})
export class ScoresModule {}

import { Module } from "@nestjs/common";
import { OsuHttpService } from "./osu.http.service";
import { OsuService } from "./osu.service";
import { OsuController } from "./osu.controller";

@Module({
  imports: [],
  controllers: [OsuController],
  providers: [OsuHttpService, OsuService],
})
export class OsuModule {}

import { Module } from "@nestjs/common";
import { OsuModule } from "../osu/osu.module";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { HttpExceptionFilter } from "./http-exception.filter";
import { ScoresModule } from "../scores/scores.module";
import { LeaderboardsModule } from "../leaderboards/leaderboards.module";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    OsuModule,
    ScoresModule,
    LeaderboardsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    // Baseline per-IP rate limit applied to every route by the APP_GUARD below;
    // CPU-/write-heavy routes tighten this further with @Throttle. In-memory
    // store — fine single-instance; front this with a shared store if scaled out.
    // NOTE: rate-keying is by req.ip, so enable Express `trust proxy` if deployed
    // behind a reverse proxy, or every client collapses to the proxy's IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

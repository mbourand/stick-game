import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * How long submits are coalesced before the `UserStats` view is refreshed. The
 * boards tolerate this much staleness; in return a burst of plays triggers a
 * single refresh rather than one per submit.
 */
const REFRESH_DEBOUNCE_MS = 30_000;

/**
 * Keeps the `UserStats` materialized view (which the player boards read) up to
 * date. Rather than rebuild it on every submit — or on a fixed timer even when
 * nothing changed — submits just flag the view dirty; a background tick then
 * refreshes it at most once per debounce window, and only when there were plays.
 *
 * `REFRESH ... CONCURRENTLY` doesn't lock the view against reads (it relies on
 * the unique index created alongside the view), so boards stay served while it
 * recomputes.
 */
@Injectable()
export class LeaderboardStatsRefresher implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LeaderboardStatsRefresher.name);
  private dirty = false;
  private refreshing = false;
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), REFRESH_DEBOUNCE_MS);
    // Don't keep the process alive just for the refresh ticker.
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Flag the boards stale; the next tick refreshes the view. */
  markDirty() {
    this.dirty = true;
  }

  private async flush() {
    if (!this.dirty || this.refreshing) return;
    this.refreshing = true;
    this.dirty = false;
    try {
      await this.prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY "UserStats"');
    } catch (error) {
      // Re-arm so the next tick retries rather than silently dropping the update.
      this.dirty = true;
      this.logger.error("Failed to refresh UserStats materialized view", error as Error);
    } finally {
      this.refreshing = false;
    }
  }
}

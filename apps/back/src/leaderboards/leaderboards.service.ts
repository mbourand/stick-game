import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { buildAvatarUrl } from "../users/users.service";
import { PlayerRankEntry, PlayerRankingMetric } from "./dto/player-ranking.dto";

/**
 * The `UserStats` column backing each board metric. This map is the *only* place
 * an API metric becomes a SQL identifier, and its values are hard-coded here —
 * so interpolating them into the raw queries below is injection-safe (the metric
 * itself is already constrained to the enum by the DTO).
 */
const METRIC_COLUMN: Record<PlayerRankingMetric, string> = {
  sss: "sssCount",
  fc: "fcCount",
  ssPlus: "ssPlusCount",
  playCount: "playCount",
};

/** A raw board row joined with the owner's live identity. */
type RankRow = {
  userId: string;
  value: number;
  username: string;
  updatedAt: Date;
  avatarMime: string | null;
};

@Injectable()
export class LeaderboardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * One page of a global player board. Reads hit the precomputed `UserStats`
   * view (an index range scan on the metric column) and join `User` only for the
   * page's rows to pick up the live username + avatar. Players with a zero value
   * are excluded so the board isn't padded with inactive accounts.
   */
  async getPlayerRankings(
    metric: PlayerRankingMetric,
    limit: number,
    offset: number,
  ): Promise<{ entries: PlayerRankEntry[]; total: number }> {
    const col = METRIC_COLUMN[metric];

    const rows = await this.prisma.$queryRawUnsafe<RankRow[]>(
      `SELECT st."userId", st."${col}" AS value, u.username, u."updatedAt", u."avatarMime"
       FROM "UserStats" st
       JOIN "User" u ON u.id = st."userId"
       WHERE st."${col}" > 0
       ORDER BY st."${col}" DESC, u.username ASC
       LIMIT $1 OFFSET $2`,
      limit,
      offset,
    );

    const totalRows = await this.prisma.$queryRawUnsafe<{ total: number }[]>(
      `SELECT COUNT(*)::int AS total FROM "UserStats" WHERE "${col}" > 0`,
    );

    const entries = rows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      username: row.username,
      // Mirror the per-map board: only point at the avatar endpoint when bytes
      // actually exist (avatarMime is set iff they do), else the client falls
      // back to the player's initial.
      avatarUrl: row.avatarMime ? buildAvatarUrl(row.userId, row.updatedAt.getTime()) : null,
      value: row.value,
    }));

    return { entries, total: totalRows[0]?.total ?? 0 };
  }

  /**
   * The caller's standing on a board: their value and 1-based competition rank
   * (count of players strictly ahead, plus one). Returns rank 0 when they have a
   * zero value, since they don't appear on the board at all.
   */
  async getPlayerRank(metric: PlayerRankingMetric, userId: string): Promise<{ rank: number; value: number }> {
    const col = METRIC_COLUMN[metric];

    const mine = await this.prisma.$queryRawUnsafe<{ value: number }[]>(
      `SELECT "${col}" AS value FROM "UserStats" WHERE "userId" = $1`,
      userId,
    );
    const value = mine[0]?.value ?? 0;
    if (value <= 0) return { rank: 0, value: 0 };

    const ranked = await this.prisma.$queryRawUnsafe<{ rank: number }[]>(
      `SELECT COUNT(*)::int + 1 AS rank FROM "UserStats" WHERE "${col}" > $1`,
      value,
    );
    return { rank: ranked[0]?.rank ?? 1, value };
  }
}

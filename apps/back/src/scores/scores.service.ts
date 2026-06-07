import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ScoreModel } from "../prisma/generated/client/models";
import { isUniqueViolation } from "../prisma/prisma-errors";
import { LeaderboardEntry, toLeaderboardEntry } from "../prisma/dto/score.dto";
import { buildAvatarUrl } from "../users/users.service";
import { LeaderboardStatsRefresher } from "../leaderboards/leaderboard-stats.refresher";
import { SCORE_VERSION } from "./scores.constants";

/** Score metrics a client submits; identity is taken from the session, never the body. */
export type SubmitScoreInput = {
  beatmapId: string;
  score: number;
  maxCombo: number;
  accuracy: number;
  missCount: number;
  mehCount: number;
  goodCount: number;
  greatCount: number;
  perfectCount: number;
  modded: boolean;
  mods: string;
};

@Injectable()
export class ScoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statsRefresher: LeaderboardStatsRefresher,
  ) {}

  /** Top scores for a board, joined with each owner's live name + avatar. */
  async getBeatmapLeaderboard(beatmapId: string, scoreVersion: number, modded: boolean): Promise<LeaderboardEntry[]> {
    const rows = await this.prisma.score.findMany({
      // `userId: not null` drops legacy anonymous rows — only accounts rank.
      where: { beatmapId, scoreVersion, modded, userId: { not: null } },
      orderBy: { score: "desc" },
      take: 50,
      include: { user: { select: { id: true, username: true, updatedAt: true } } },
    });

    return rows.map((row) =>
      toLeaderboardEntry(row, row.user ? buildAvatarUrl(row.user.id, row.user.updatedAt.getTime()) : null),
    );
  }

  getBeatmapPersonalBest(beatmapId: string, userId: string, scoreVersion: number, modded: boolean) {
    return this.prisma.score.findFirst({
      where: { beatmapId, userId, scoreVersion, modded },
      orderBy: { score: "desc" },
    });
  }

  /**
   * Record a play: count it toward the account's play total, then save it as the
   * new personal best if it beats the current one. Every submit is an attempt,
   * so `playCount` bumps regardless of whether the score was uploaded.
   */
  async submitScore(
    userId: string,
    playerName: string,
    input: SubmitScoreInput,
  ): Promise<{ wasUploaded: boolean; score: ScoreModel }> {
    const result = await this.upsertPersonalBest(userId, playerName, input);

    // Independent atomic increment — kept out of the personal-best path above,
    // whose create-then-conditional-update can't share one Postgres transaction
    // (a P2002 there aborts the whole transaction).
    await this.prisma.user.update({ where: { id: userId }, data: { playCount: { increment: 1 } } });

    // Both the new best and the higher play count change the boards — flag them
    // stale so the next refresh tick picks the change up.
    this.statsRefresher.markDirty();

    return result;
  }

  /** Save the play if it beats the account's current best on this board. */
  private async upsertPersonalBest(
    userId: string,
    playerName: string,
    input: SubmitScoreInput,
  ): Promise<{ wasUploaded: boolean; score: ScoreModel }> {
    const data = { ...input, userId, playerName, scoreVersion: SCORE_VERSION };

    // First play on this board: a plain insert. Two racing first-submits collide
    // on the unique key — the loser's P2002 drops it into the conditional update.
    try {
      const score = await this.prisma.score.create({ data });
      return { wasUploaded: true, score };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }

    // A best already exists. Overwrite it in a single statement, but only if this
    // play actually beats it: the `score < input.score` guard is evaluated under
    // the row lock, so two concurrent submits can never let a lower score clobber
    // a higher one (which a read-then-write check would allow).
    const { count } = await this.prisma.score.updateMany({
      where: {
        userId,
        beatmapId: input.beatmapId,
        scoreVersion: SCORE_VERSION,
        modded: input.modded,
        score: { lt: input.score },
      },
      data,
    });

    // Whether or not we just wrote, the row is the current best for this board.
    const score = await this.getBeatmapPersonalBest(input.beatmapId, userId, SCORE_VERSION, input.modded);
    if (!score) throw new Error("Personal-best row vanished mid-submit"); // unreachable: a row exists by here
    return { wasUploaded: count > 0, score };
  }
}

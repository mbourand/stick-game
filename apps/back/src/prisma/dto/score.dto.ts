import { createZodDto } from "nestjs-zod";
import { ScoreSchema } from "../generated/zod/schemas";
import z from "zod";

/**
 * A leaderboard row as exposed to clients: the score metrics joined with the
 * owning account's live display name + avatar. Replaces the old `playerName`
 * snapshot with the account's current identity.
 */
export const LeaderboardEntrySchema = ScoreSchema.pick({
  beatmapId: true,
  score: true,
  maxCombo: true,
  accuracy: true,
  missCount: true,
  mehCount: true,
  goodCount: true,
  greatCount: true,
  perfectCount: true,
  scoreVersion: true,
  modded: true,
  mods: true,
})
  .extend({
    userId: z.string(),
    username: z.string().min(1).max(32),
    avatarUrl: z.string().nullable(),
    submissionTime: z.iso.datetime(),
  })
  .strict();

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>;

/** A persisted Score joined with its owning account. */
export type ScoreWithUser = z.infer<typeof ScoreSchema> & {
  user: { username: string } | null;
};

export const toLeaderboardEntry = (score: ScoreWithUser, avatarUrl: string | null): LeaderboardEntry => ({
  userId: score.userId ?? "",
  username: score.user?.username ?? score.playerName,
  avatarUrl,
  beatmapId: score.beatmapId,
  score: score.score,
  maxCombo: score.maxCombo,
  accuracy: score.accuracy,
  missCount: score.missCount,
  mehCount: score.mehCount,
  goodCount: score.goodCount,
  greatCount: score.greatCount,
  perfectCount: score.perfectCount,
  submissionTime: score.submissionTime.toISOString(),
  scoreVersion: score.scoreVersion,
  modded: score.modded,
  mods: score.mods,
});

export class LeaderboardEntryDto extends createZodDto(LeaderboardEntrySchema) {}

/** The caller's own score row — same shape as a leaderboard entry minus the
 * identity fields they already know about themselves. */
export const SelfScoreSchema = LeaderboardEntrySchema.omit({ userId: true, avatarUrl: true });

export type SelfScore = z.infer<typeof SelfScoreSchema>;

export const toSelfScore = (score: z.infer<typeof ScoreSchema>, username: string): SelfScore => {
  const { userId: _userId, avatarUrl: _avatarUrl, ...self } = toLeaderboardEntry({ ...score, user: { username } }, null);
  return self;
};

export class SelfScoreDto extends createZodDto(SelfScoreSchema) {}

import { createZodDto } from "nestjs-zod";
import z from "zod";
import { LeaderboardEntrySchema, SelfScoreSchema } from "../../../prisma/dto/score.dto";

// The body carries only the play's metrics — the player's identity comes from
// the session token, never the request body.
const BodySchema = LeaderboardEntrySchema.pick({
  beatmapId: true,
  score: true,
  maxCombo: true,
  accuracy: true,
  missCount: true,
  mehCount: true,
  goodCount: true,
  greatCount: true,
  perfectCount: true,
  modded: true,
  mods: true,
}).strict();

const ResponseSchema = z.strictObject({
  wasUploaded: z.boolean(),
  score: SelfScoreSchema,
});

export class PostScoresSubmitBodyDto extends createZodDto(BodySchema) {}
export class PostScoresSubmitResponseDto extends createZodDto(ResponseSchema) {}

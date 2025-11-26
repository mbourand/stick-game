import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ScoreCreateInput, ScoreModel } from "../prisma/generated/client/models";
import { LATEST_SCORE_VERSION } from "./score.constants";
import { RawUserType } from "../prisma/dto/user.dto";

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async getBeatmapLeaderboard(beatmapId: string, scoreVersion: number) {
    return this.prisma.score.findMany({
      where: { beatmapId, scoreVersion },
      orderBy: { score: "desc" },
      take: 50,
      include: { player: true },
    });
  }

  async getBeatmapPersonalBest(beatmapId: string, playerId: string, scoreVersion: number) {
    return this.prisma.score.findFirst({
      where: { beatmapId, playerId, scoreVersion },
      orderBy: { score: "desc" },
      include: { player: true },
    });
  }

  // Saves the new score to the database if it is the new personal best
  async submitScore(
    score: Omit<ScoreCreateInput, "scoreVersion" | "player" | "playerName">,
    user: RawUserType,
  ): Promise<{ wasUploaded: boolean; score: ScoreModel }> {
    const currentPersonalBest = await this.getBeatmapPersonalBest(score.beatmapId, user.id, LATEST_SCORE_VERSION);
    if (currentPersonalBest && score.score <= currentPersonalBest.score) {
      return { wasUploaded: false, score: currentPersonalBest };
    }

    const hydratedScore: ScoreCreateInput = {
      ...score,
      scoreVersion: LATEST_SCORE_VERSION,
      player: { connect: { id: user.id } },
    };

    const newScore = currentPersonalBest
      ? await this.prisma.score.update({
          where: { id: currentPersonalBest.id },
          data: hydratedScore,
        })
      : await this.prisma.score.create({
          data: hydratedScore,
        });

    if (!newScore) {
      throw new Error("Failed to submit score");
    }

    return { wasUploaded: true, score: newScore };
  }
}

import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ScoreCreateInput, ScoreModel } from "../prisma/generated/client/models";

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async getBeatmapLeaderboard(beatmapId: string, scoreVersion: number, modded: boolean) {
    return this.prisma.score.findMany({
      where: { beatmapId, scoreVersion, modded },
      orderBy: { score: "desc" },
      take: 50,
    });
  }

  async getBeatmapPersonalBest(beatmapId: string, playerName: string, scoreVersion: number, modded: boolean) {
    return this.prisma.score.findFirst({
      where: { beatmapId, playerName, scoreVersion, modded },
      orderBy: { score: "desc" },
    });
  }

  // Saves the new score to the database if it is the new personal best
  async submitScore(
    score: Omit<ScoreCreateInput, "scoreVersion">,
  ): Promise<{ wasUploaded: boolean; score: ScoreModel }> {
    const currentPersonalBest = await this.getBeatmapPersonalBest(
      score.beatmapId,
      score.playerName,
      3,
      score.modded ?? false,
    );
    if (currentPersonalBest && score.score <= currentPersonalBest.score) {
      return { wasUploaded: false, score: currentPersonalBest };
    }

    const hydratedScore: ScoreCreateInput = {
      ...score,
      scoreVersion: 3,
    };

    const newScore = await this.prisma.score.upsert({
      where: {
        playerName_beatmapId_scoreVersion_modded: {
          playerName: score.playerName,
          beatmapId: score.beatmapId,
          scoreVersion: 3,
          modded: score.modded ?? false,
        },
      },
      update: hydratedScore,
      create: hydratedScore,
    });

    if (!newScore) {
      throw new Error("Failed to submit score");
    }

    return { wasUploaded: true, score: newScore };
  }
}

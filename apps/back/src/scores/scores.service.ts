import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { ScoreCreateInput, ScoreModel } from "../prisma/generated/client/models";

@Injectable()
export class ScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async getBeatmapLeaderboard(beatmapId: number) {
    return this.prisma.score.findMany({
      where: { beatmapId },
      orderBy: { score: "desc" },
      take: 50,
    });
  }

  async getBeatmapPersonalBest(beatmapId: number, playerName: string) {
    return this.prisma.score.findFirst({
      where: { beatmapId, playerName },
      orderBy: { score: "desc" },
    });
  }

  // Saves the new score to the database if it is the new personal best
  async submitScore(score: ScoreCreateInput): Promise<{ wasUploaded: boolean; score: ScoreModel }> {
    const currentPersonalBest = await this.getBeatmapPersonalBest(score.beatmapId, score.playerName);
    if (currentPersonalBest && score.score <= currentPersonalBest.score) {
      return { wasUploaded: false, score: currentPersonalBest };
    }

    const newScore = await this.prisma.score.upsert({
      where: {
        id: currentPersonalBest ? currentPersonalBest.id : undefined,
        playerName: {
          equals: score.playerName,
        },
        beatmapId: {
          equals: score.beatmapId,
        },
      },
      update: score,
      create: score,
    });

    if (!newScore) {
      throw new Error("Failed to submit score");
    }

    return { wasUploaded: true, score: newScore };
  }
}

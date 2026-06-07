/**
 * Seeds the database with fake accounts + scores so the global player
 * leaderboards have something to show in development. Each seed account is
 * tagged with a `seed:<n>` sentinel in its (otherwise opaque) `discordId`, so
 * re-running replaces the previous batch and `--clean` removes them — without
 * ever touching real accounts.
 *
 * Run from apps/back:
 *   node -r dotenv/config -r ts-node/register/transpile-only prisma/seed.ts
 *   node -r dotenv/config -r ts-node/register/transpile-only prisma/seed.ts --clean
 */
import "dotenv/config";
import { PrismaClient } from "../src/prisma/generated/client/client";

const prisma = new PrismaClient();

/** Must match the score version the UserStats view aggregates (see migration). */
const SCORE_VERSION = 3;
/** Marks our rows so cleanup never deletes a real account. */
const SEED_TAG = "seed:";

/** Distinctive (clearly-not-real) display names for the fake roster. */
const NAMES = [
  "Aurora", "Nyx", "Quasar", "Vesper", "Koda", "Lumen", "Onyx", "Pixel",
  "Zephyr", "Echo", "Saffron", "Tycho", "Iris", "Volt", "Maple", "Cobalt",
  "Wren", "Solace", "Drift", "Halcyon",
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

type ScoreSeed = { beatmapId: string; accuracy: number; missCount: number };

/**
 * Builds a player's personal bests. Categories map directly onto the board
 * filters: SSS (acc 100), SS+ (no-miss & acc ≥ 98), FC (no-miss). An SSS is
 * also a no-miss SS+, so it counts on every grade board — just like a real run.
 */
function buildScores(): ScoreSeed[] {
  const sss = randInt(0, 34); // accuracy 100, no miss
  const ssPlusOnly = randInt(0, 18); // 98–99.9, no miss
  const fcOnly = randInt(0, 22); // < 98, no miss
  const nonFc = randInt(0, 18); // has misses

  const scores: ScoreSeed[] = [];
  let map = 0;
  const push = (accuracy: number, missCount: number) =>
    scores.push({ beatmapId: `seed-map-${map++}`, accuracy: Number(accuracy.toFixed(2)), missCount });

  for (let i = 0; i < sss; i++) push(100, 0);
  for (let i = 0; i < ssPlusOnly; i++) push(rand(98, 99.9), 0);
  for (let i = 0; i < fcOnly; i++) push(rand(80, 97.9), 0);
  for (let i = 0; i < nonFc; i++) push(rand(60, 99), randInt(1, 30));
  return scores;
}

/** Plausible judgment breakdown + score for a personal best of the given shape. */
function scoreRow(userId: string, username: string, s: ScoreSeed) {
  const maxCombo = randInt(150, 900);
  const notes = maxCombo + s.missCount;
  const perfectCount = Math.round((notes * s.accuracy) / 100);
  const remainder = Math.max(0, notes - perfectCount - s.missCount);
  return {
    userId,
    playerName: username,
    beatmapId: s.beatmapId,
    score: Math.round(s.accuracy * 9000 + rand(0, 60000)),
    maxCombo,
    accuracy: s.accuracy,
    missCount: s.missCount,
    mehCount: Math.round(remainder * 0.2),
    goodCount: Math.round(remainder * 0.3),
    greatCount: remainder - Math.round(remainder * 0.2) - Math.round(remainder * 0.3),
    perfectCount,
    scoreVersion: SCORE_VERSION,
    modded: false,
    mods: "",
  };
}

async function clean(): Promise<number> {
  // Cascade on Score.userId removes their scores too.
  const { count } = await prisma.user.deleteMany({ where: { discordId: { startsWith: SEED_TAG } } });
  return count;
}

async function main() {
  const cleanOnly = process.argv.includes("--clean");

  const removed = await clean();
  if (removed) console.log(`Removed ${removed} previous seed account(s).`);

  if (cleanOnly) {
    await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW "UserStats"');
    console.log("Cleaned. UserStats refreshed.");
    return;
  }

  let totalScores = 0;
  for (let i = 0; i < NAMES.length; i++) {
    const username = NAMES[i];
    const scores = buildScores();
    const user = await prisma.user.create({
      data: {
        username,
        discordId: `${SEED_TAG}${i}`,
        // Play count is its own board and isn't derived from the (best-only)
        // Score rows — at least the scores we made, plus extra attempts.
        playCount: scores.length + randInt(5, 400),
      },
    });
    if (scores.length > 0) {
      await prisma.score.createMany({ data: scores.map((s) => scoreRow(user.id, username, s)) });
    }
    totalScores += scores.length;
  }

  // Recompute the boards' source view so reads reflect the new rows immediately.
  await prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW "UserStats"');

  console.log(`Seeded ${NAMES.length} accounts with ${totalScores} scores. UserStats refreshed.`);
  for (const metric of ["sssCount", "fcCount", "ssPlusCount", "playCount"] as const) {
    const top = await prisma.$queryRawUnsafe<{ username: string; value: number }[]>(
      `SELECT u.username, st."${metric}" AS value FROM "UserStats" st
       JOIN "User" u ON u.id = st."userId" WHERE st."${metric}" > 0
       ORDER BY st."${metric}" DESC LIMIT 3`,
    );
    console.log(`  ${metric}: ${top.map((r) => `${r.username} (${r.value})`).join(", ") || "—"}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());

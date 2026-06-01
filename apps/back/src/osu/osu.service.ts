import { Injectable } from "@nestjs/common";
import { OsuHttpService } from "./osu.http.service";
import { PrismaService } from "../prisma/prisma.service";
import z from "zod";
import { BeatmapSchema, BeatmapSetSchema } from "./osu.schemas";
import { GetOsuDailyResponse, GetOsuDailyResponseSchema } from "./dto/routes/get-osu-daily.dto";

type BeatmapSet = z.infer<typeof BeatmapSetSchema>;
type Beatmap = z.infer<typeof BeatmapSchema>;

/**
 * osu! star ratings used as a proxy for Tau's own difficulty ranges. An eligible
 * set must have at least one difficulty in EASY_STARS (Tau ~0-3*) and at least one
 * in HARD_STARS (Tau ~4-6*). Tunable once we see real picks.
 */
const EASY_STARS = { min: 3, max: 4 };
const HARD_STARS = { min: 6, max: 13 };
const MIN_LENGTH_SECONDS = 60;
const MAX_LENGTH_SECONDS = 420;
const MAX_DIFFICULTIES = 7; // strictly fewer than 6 osu!standard diffs

/**
 * Pages (50 sets each) pulled per category. osu! returns these newest-first, so
 * this is "the N most recent ranked + loved sets". Bigger = larger candidate
 * pool = lower chance the criteria filter comes up empty, at the cost of more
 * (per-day cached) API calls.
 */
const CANDIDATE_PAGES_PER_CATEGORY = 6;

/** Don't re-feature a set that was picked within this many days. */
const NO_REPEAT_DAYS = 30;

@Injectable()
export class OsuService {
  private dailyCache: { date: string; value: GetOsuDailyResponse } | null = null;

  constructor(
    private readonly osuHttpService: OsuHttpService,
    private readonly prisma: PrismaService,
  ) {}

  async searchBeatmapsets(query: string) {
    const sanitizedQuery = encodeURIComponent(query);
    const data = await this.osuHttpService.get(
      `/beatmapsets/search?s=any&m=0&q=${sanitizedQuery}`,
      z.object({ beatmapsets: z.array(BeatmapSetSchema) }),
    );

    return data;
  }

  async getDailyBeatmapset(): Promise<GetOsuDailyResponse> {
    const date = utcDateString();
    if (this.dailyCache && this.dailyCache.date === date) {
      return this.dailyCache.value;
    }

    // Today's pick may already be persisted (another instance, or this process
    // before a restart) — serve the stored payload so the map stays stable.
    const existing = await this.prisma.dailyFeature.findUnique({ where: { date } });
    if (existing) {
      const value = GetOsuDailyResponseSchema.parse(existing.payload);
      this.dailyCache = { date, value };
      return value;
    }

    // Real recent history: never re-feature a set picked in the last
    // NO_REPEAT_DAYS, regardless of how the candidate pool has drifted.
    const recent = await this.prisma.dailyFeature.findMany({
      where: { date: { lt: date } },
      orderBy: { date: "desc" },
      take: NO_REPEAT_DAYS,
      select: { beatmapsetId: true },
    });
    const excludeIds = new Set(recent.map((r) => r.beatmapsetId));

    const pool = await this.fetchCandidatePool();
    const value = pickDaily(pool, date, excludeIds);

    try {
      await this.prisma.dailyFeature.create({
        data: { date, beatmapsetId: value.beatmapsetId, payload: value },
      });
    } catch {
      // A concurrent request persisted today's row first — defer to it so every
      // client sees the same map even under a cold-cache race.
      const row = await this.prisma.dailyFeature.findUnique({ where: { date } });
      if (row) {
        const persisted = GetOsuDailyResponseSchema.parse(row.payload);
        this.dailyCache = { date, value: persisted };
        return persisted;
      }
    }

    this.dailyCache = { date, value };
    return value;
  }

  /** Pull the most recent ranked + loved osu!standard sets as the candidate pool. */
  private async fetchCandidatePool(): Promise<BeatmapSet[]> {
    const [ranked, loved] = await Promise.all([
      this.fetchCategory("ranked", CANDIDATE_PAGES_PER_CATEGORY),
      this.fetchCategory("loved", CANDIDATE_PAGES_PER_CATEGORY),
    ]);

    // Dedupe by set id (a set can surface in both categories in edge cases).
    const byId = new Map<number, BeatmapSet>();
    for (const set of [...ranked, ...loved]) {
      byId.set(set.id, set);
    }
    return [...byId.values()];
  }

  /**
   * Page through one search category via osu!'s `cursor_string`, accumulating up
   * to `pages` pages (50 sets each). Stops early when the API runs out of pages.
   */
  private async fetchCategory(category: "ranked" | "loved", pages: number): Promise<BeatmapSet[]> {
    const responseSchema = z.object({
      beatmapsets: z.array(BeatmapSetSchema),
      cursor_string: z.string().nullish(),
    });

    const sets: BeatmapSet[] = [];
    let cursor: string | null | undefined;
    for (let page = 0; page < pages; page++) {
      const cursorParam = cursor ? `&cursor_string=${encodeURIComponent(cursor)}` : "";
      const data = await this.osuHttpService.get(
        `/beatmapsets/search?s=${category}&m=0${cursorParam}`,
        responseSchema,
      );
      sets.push(...data.beatmapsets);
      cursor = data.cursor_string;
      if (!cursor) break; // no more pages
    }
    return sets;
  }
}

/** osu!standard diffs only — Tau converts osu!standard. */
const stdDiffs = (set: BeatmapSet): Beatmap[] => set.beatmaps.filter((b) => b.mode_int === 0);

const setLengthSeconds = (diffs: Beatmap[]): number => diffs.reduce((max, d) => Math.max(max, d.total_length), 0);

type Criteria = {
  easy: { min: number; max: number };
  hard: { min: number; max: number };
  minLength: number;
  maxLength: number;
};

const STRICT: Criteria = {
  easy: EASY_STARS,
  hard: HARD_STARS,
  minLength: MIN_LENGTH_SECONDS,
  maxLength: MAX_LENGTH_SECONDS,
};

/** Progressive relaxations applied only if STRICT yields an empty pool. */
const RELAXATIONS: Criteria[] = [
  // Widen length tolerance too.
  { ...STRICT, minLength: 30, maxLength: 600 },
];

const isEligible = (set: BeatmapSet, c: Criteria): boolean => {
  if (set.status !== "ranked" && set.status !== "loved" && set.status !== "approved") return false;
  const diffs = stdDiffs(set);
  if (diffs.length === 0 || diffs.length >= MAX_DIFFICULTIES) return false;

  const length = setLengthSeconds(diffs);
  if (length < c.minLength || length > c.maxLength) return false;

  const hasEasy = diffs.some((d) => d.difficulty_rating >= c.easy.min && d.difficulty_rating <= c.easy.max);
  const hasHard = diffs.some((d) => d.difficulty_rating >= c.hard.min && d.difficulty_rating <= c.hard.max);
  return hasEasy && hasHard;
};

const pickDaily = (pool: BeatmapSet[], date: string, excludeIds: Set<number>): GetOsuDailyResponse => {
  let degraded = false;
  let eligible = pool.filter((s) => isEligible(s, STRICT));
  for (const relaxed of RELAXATIONS) {
    if (eligible.length > 0) break;
    degraded = true;
    eligible = pool.filter((s) => isEligible(s, relaxed));
  }

  if (eligible.length === 0) {
    // Last resort: any set with osu!standard diffs, so the endpoint never 500s.
    degraded = true;
    eligible = pool.filter((s) => stdDiffs(s).length > 0);
  }
  if (eligible.length === 0) {
    throw new Error("No osu!standard beatmapsets available to feature as the daily map.");
  }

  // Drop anything featured within the no-repeat window. Fall back to the full
  // pool only if that window is wider than the pool (so we never come up empty).
  const fresh = eligible.filter((s) => !excludeIds.has(s.id));
  const candidates = fresh.length > 0 ? fresh : eligible;

  // Stable order, then deterministic per-day index.
  candidates.sort((a, b) => a.id - b.id);
  const chosen = candidates[hashString(date) % candidates.length];

  return toResponse(chosen, date, degraded);
};

const toResponse = (set: BeatmapSet, date: string, degraded: boolean): GetOsuDailyResponse => {
  const diffs = stdDiffs(set).sort((a, b) => a.difficulty_rating - b.difficulty_rating);
  const stars = diffs.map((d) => d.difficulty_rating);
  return {
    date,
    beatmapsetId: set.id,
    title: set.title,
    artist: set.artist,
    creator: set.creator,
    coverUrl: set.covers["cover@2x"] ?? set.covers.cover ?? set.covers.card ?? "",
    lengthSeconds: setLengthSeconds(diffs),
    beatmapIds: diffs.map((d) => d.id),
    difficulties: diffs.map((d) => ({ id: d.id, version: d.version, stars: d.difficulty_rating })),
    starRange: { min: Math.min(...stars), max: Math.max(...stars) },
    degraded,
  };
};

/** Current UTC day as YYYY-MM-DD, so every client agrees on "today". */
const utcDateString = (): string => new Date().toISOString().slice(0, 10);

/** Deterministic 32-bit FNV-1a hash of a string. */
const hashString = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

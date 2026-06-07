-- Total play attempts per account. The Score table only keeps personal bests,
-- so play count can't be derived from it — track it directly here.
ALTER TABLE "User" ADD COLUMN "playCount" INTEGER NOT NULL DEFAULT 0;

-- Per-account ranking aggregates powering the global "grade hunting" + play-count
-- boards. Reading these live would scan every personal best on each request; a
-- materialized view keeps reads O(precomputed) and is refreshed on a debounce by
-- the backend (REFRESH ... CONCURRENTLY, which the unique index below enables).
--
-- Counts span BOTH modded and no-mods personal bests (a grade earned either way
-- counts), restricted to the current score version so an algorithm change can't
-- mix incomparable accuracies. NOTE: the score version is baked in here — bumping
-- SCORE_VERSION requires a follow-up migration to rebuild this view.
CREATE MATERIALIZED VIEW "UserStats" AS
SELECT
  u.id                                                                     AS "userId",
  u."playCount"                                                            AS "playCount",
  COUNT(*) FILTER (WHERE s.accuracy >= 100)::int                           AS "sssCount",
  COUNT(*) FILTER (WHERE s."missCount" = 0)::int                           AS "fcCount",
  COUNT(*) FILTER (WHERE s."missCount" = 0 AND s.accuracy >= 98)::int      AS "ssPlusCount"
FROM "User" u
LEFT JOIN "Score" s ON s."userId" = u.id AND s."scoreVersion" = 3
GROUP BY u.id, u."playCount";

-- Unique index is mandatory for REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX "UserStats_userId_key" ON "UserStats" ("userId");
-- One descending index per sortable board metric, so a page is an index range scan.
CREATE INDEX "UserStats_sssCount_idx" ON "UserStats" ("sssCount" DESC);
CREATE INDEX "UserStats_fcCount_idx" ON "UserStats" ("fcCount" DESC);
CREATE INDEX "UserStats_ssPlusCount_idx" ON "UserStats" ("ssPlusCount" DESC);
CREATE INDEX "UserStats_playCount_idx" ON "UserStats" ("playCount" DESC);

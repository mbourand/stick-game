-- Rescale modded scores onto the new diminishing-returns rate curve.
--
-- The rate score multiplier changed from a raw 1:1 rate to a curve that gives
-- diminishing returns above 1x (0.5x->0.5, 1x->1, 1.5x->1.2, 2x->1.4). Old
-- scores baked the raw rate into their value, so to keep leaderboards fair we
-- rescale each modded play by newMultiplier / rate, where
--   newMultiplier = 1 + (rate - 1) * 0.4   (for rate > 1)
-- The rate is parsed from the human-readable `mods` summary (e.g. "Rate x1.50").
--
-- Scores at rate <= 1 are untouched: the new curve is identical to the old one
-- there (multiplier == rate), so their value would not change.
UPDATE "Score"
SET "score" = ROUND(
  "score"::numeric
  * (1 + (substring("mods" from '[0-9.]+')::numeric - 1) * 0.4)
  / substring("mods" from '[0-9.]+')::numeric
)::int
WHERE "modded" = true
  AND substring("mods" from '[0-9.]+') IS NOT NULL
  AND substring("mods" from '[0-9.]+')::numeric > 1;

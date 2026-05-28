/**
 * A Playable is something that advances in time. The scheduler ticks it; the
 * compositions (Sequence / Parallel / Stagger) tick their children with it.
 *
 * Update returns leftover dt — the slice of `dt` that wasn't consumed because
 * the playable finished mid-frame. Sequence forwards that leftover to the next
 * child so multi-step timelines don't accumulate drift at boundaries. Playables
 * that consume time (Tween, Wait, Spring) return >= 0 leftover when they
 * finish; ones that don't consume time (Call, Set) return the input dt
 * unchanged.
 *
 * `done` resolves when the playable finishes, whether by completion or by
 * `cancel()`. Cancellation does NOT reject — orchestrators get a single,
 * uniform "this is over now" signal and can decide how to react.
 */
export interface Playable {
  update(dt: number): number;

  isFinished(): boolean;

  pause(): void;
  resume(): void;
  cancel(): void;

  readonly done: Promise<void>;
}

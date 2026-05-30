import { LifecyclePlayable } from "./LifecyclePlayable";
import type { Playable } from "./Playable";
import { collectNumericTargets, type TweenTargets } from "./Tween";

/** Composition base: propagates pause/resume/cancel to children. */
abstract class Composition extends LifecyclePlayable {
  protected readonly children: Playable[];

  constructor(children: Playable[]) {
    super();
    this.children = children;
  }

  protected override onPause(): void {
    for (const child of this.children) child.pause();
  }

  protected override onResume(): void {
    for (const child of this.children) child.resume();
  }

  protected override onCancel(): void {
    for (const child of this.children) {
      if (!child.isFinished()) child.cancel();
    }
  }
}

/**
 * Runs children one after another. Leftover dt from a finishing child flows
 * into the next, so zero-duration steps (Call, Set, Wait(0)) don't waste a
 * frame each and long sequences stay drift-free at boundaries.
 */
export class Sequence extends Composition {
  private index = 0;

  protected tick(dt: number): number {
    if (this.children.length === 0) {
      this.finish();
      return dt;
    }

    let remaining = dt;
    while (this.index < this.children.length) {
      const child = this.children[this.index];
      const leftover = child.update(remaining);
      if (!child.isFinished()) return 0;
      remaining = leftover;
      this.index++;
    }

    this.finish();
    return remaining;
  }
}

/**
 * Runs all children concurrently. Finishes when every child has finished.
 * Leftover dt isn't well-defined for parallel since children may finish at
 * different points in the frame; returns 0.
 */
export class Parallel extends Composition {
  protected tick(dt: number): number {
    if (this.children.length === 0) {
      this.finish();
      return dt;
    }

    let allDone = true;
    for (const child of this.children) {
      if (child.isFinished()) continue;
      child.update(dt);
      if (!child.isFinished()) allDone = false;
    }

    if (allDone) this.finish();
    return 0;
  }
}

/** Sleeps for `ms` milliseconds. Useful inside a Sequence as a gap. */
export class Wait extends LifecyclePlayable {
  private elapsed = 0;
  private readonly duration: number;

  constructor(ms: number) {
    super();
    this.duration = Math.max(0, ms);
    if (this.duration === 0) this.finish();
  }

  protected tick(dt: number): number {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      const leftover = this.elapsed - this.duration;
      this.finish();
      return leftover;
    }
    return 0;
  }
}

/** Fires a callback once, the first frame it is updated. */
export class Call extends LifecyclePlayable {
  constructor(private readonly fn: () => void) {
    super();
  }

  protected tick(dt: number): number {
    this.fn();
    this.finish();
    return dt;
  }
}

/**
 * A Playable that never finishes on its own — it waits until `release()`
 * (or `cancel()`) is called externally. Use inside a Sequence to pause a
 * timeline on an external signal: a Promise, a DOM "exit animation finished"
 * callback, a network request, etc.
 *
 *   const g = gate();
 *   somePromise.then(() => g.release());
 *   scheduler.play(sequence([tween(...), g, tween(...)]));
 */
export class Gate extends LifecyclePlayable {
  protected tick(_dt: number): number {
    return 0;
  }

  public release(): void {
    this.finish();
  }
}

/** Snaps the target's properties to the given values in a single frame. */
export class SetValues<T extends object> extends LifecyclePlayable {
  private readonly values: Map<keyof T, number>;

  constructor(
    private readonly target: T,
    values: TweenTargets<T>,
  ) {
    super();
    this.values = collectNumericTargets(values);
  }

  protected tick(dt: number): number {
    for (const [key, value] of this.values) {
      (this.target as Record<keyof T, number>)[key] = value;
    }
    this.finish();
    return dt;
  }
}

export const sequence = (children: Playable[]): Sequence => new Sequence(children);
export const parallel = (children: Playable[]): Parallel => new Parallel(children);
export const wait = (ms: number): Wait => new Wait(ms);
export const call = (fn: () => void): Call => new Call(fn);
export const gate = (): Gate => new Gate();
export const set = <T extends object>(target: T, values: TweenTargets<T>): SetValues<T> =>
  new SetValues(target, values);

/**
 * Runs children in parallel, but offsets each one's start by `gapMs * index`.
 * Useful for radial menus, list animations, etc.
 */
export const stagger = (children: Playable[], gapMs: number): Parallel =>
  parallel(children.map((child, i) => (i === 0 ? child : sequence([wait(gapMs * i), child]))));

import { DEFAULT_ACTION_BINDINGS, type ActionBindings, type ButtonAction } from "./actions";
import type { InputDeviceAdapter } from "./InputDeviceAdapter";

type ActionHandler = () => void;
type HandlerMap = Map<ButtonAction, Set<ActionHandler>>;

type RepeatTimingOpts = { initialDelayMs?: number; repeatIntervalMs?: number };
type RepeatTimers = { cancel: () => void };

/**
 * Press-and-hold core shared by onActionRepeat / onStickRepeat. Calls `handler`
 * immediately, then once after `initialDelayMs`, then every `repeatIntervalMs`
 * until the returned `cancel` is called. Callers own when to call cancel —
 * typically on the matching release edge.
 */
function armRepeat(handler: () => void, opts: RepeatTimingOpts): RepeatTimers {
  const initialDelayMs = opts.initialDelayMs ?? 350;
  const repeatIntervalMs = opts.repeatIntervalMs ?? 60;
  handler();
  let initialTimer: ReturnType<typeof setTimeout> | null = null;
  let repeatTimer: ReturnType<typeof setInterval> | null = null;
  initialTimer = setTimeout(() => {
    initialTimer = null;
    repeatTimer = setInterval(handler, repeatIntervalMs);
  }, initialDelayMs);
  return {
    cancel: () => {
      if (initialTimer !== null) {
        clearTimeout(initialTimer);
        initialTimer = null;
      }
      if (repeatTimer !== null) {
        clearInterval(repeatTimer);
        repeatTimer = null;
      }
    },
  };
}

const ZERO_STICK = { x: 0, y: 0 };

export class InputSystem {
  private readonly adapters: InputDeviceAdapter[];
  private bindings: ActionBindings;

  private downHandlers: HandlerMap = new Map();
  private upHandlers: HandlerMap = new Map();
  private deviceUnsubscribes: (() => void)[] = [];
  /** Per-frame stick samplers driving onStickRepeat. Ticked by `update`. */
  private stickPolls = new Set<() => void>();

  constructor(adapters: InputDeviceAdapter[], bindings: ActionBindings = DEFAULT_ACTION_BINDINGS) {
    this.adapters = adapters;
    this.bindings = bindings;
    this.wireBindings();
  }

  public destroy() {
    this.deviceUnsubscribes.forEach((off) => off());
    this.deviceUnsubscribes = [];
    this.downHandlers.clear();
    this.upHandlers.clear();
    this.stickPolls.clear();
    for (const adapter of this.adapters) adapter.destroy?.();
  }

  public onActionDown(action: ButtonAction, handler: ActionHandler): () => void {
    return this.addHandler(this.downHandlers, action, handler);
  }

  public onActionUp(action: ButtonAction, handler: ActionHandler): () => void {
    return this.addHandler(this.upHandlers, action, handler);
  }

  /**
   * First adapter that exposes a stick wins. Stickless adapters (keyboard,
   * mouse, …) return null and are skipped. With no stick devices, returns
   * the zero vector.
   */
  public getStick(side: "left" | "right"): { x: number; y: number } {
    for (const adapter of this.adapters) {
      const v = adapter.getStick(side);
      if (v !== null) return v;
    }
    return ZERO_STICK;
  }

  /**
   * Press-with-repeat: handler fires once on press, then once after
   * `initialDelayMs`, then every `repeatIntervalMs` until release. Used for
   * UI list navigation (d-pad up/down) where a single tap moves one item
   * and a held press passes through items at the repeat rate.
   *
   * Returns a disposer that removes the subscriptions and clears any pending
   * timers. Callers tie this to their own lifetime (Scene.activeDisposers,
   * useEffect cleanup, etc.).
   */
  public onActionRepeat(
    action: ButtonAction,
    handler: () => void,
    opts: RepeatTimingOpts = {},
  ): () => void {
    let timers: RepeatTimers | null = null;
    const offDown = this.onActionDown(action, () => {
      timers?.cancel();
      timers = armRepeat(handler, opts);
    });
    const offUp = this.onActionUp(action, () => {
      timers?.cancel();
      timers = null;
    });
    return () => {
      offDown();
      offUp();
      timers?.cancel();
    };
  }

  /**
   * Edge-triggered stick navigation with hysteresis and press-and-hold repeat.
   * The gamepad-stick analogue of `onActionRepeat` — handler fires once when
   * the dominant stick crosses `engageThreshold` on `axis`, then waits
   * `initialDelayMs`, then repeats every `repeatIntervalMs` until the stick
   * returns below `releaseThreshold`. The lower release threshold keeps a
   * stick parked near the engage line from oscillating.
   *
   * Both sticks vote: the one with the larger absolute value on `axis` wins,
   * so either stick can drive the menu.
   *
   * Returns a disposer that removes the per-frame poll and clears timers.
   */
  public onStickRepeat(
    axis: "x" | "y",
    handler: (dir: -1 | 1) => void,
    opts: RepeatTimingOpts & {
      engageThreshold?: number;
      releaseThreshold?: number;
    } = {},
  ): () => void {
    const engage = opts.engageThreshold ?? 0.3;
    const release = opts.releaseThreshold ?? 0.2;

    let engagedDir: -1 | 1 | null = null;
    let timers: RepeatTimers | null = null;

    const poll = () => {
      const left = this.getStick("left");
      const right = this.getStick("right");
      const a = left[axis];
      const b = right[axis];
      const v = Math.abs(a) >= Math.abs(b) ? a : b;

      if (engagedDir !== null) {
        if (Math.abs(v) < release) {
          engagedDir = null;
          timers?.cancel();
          timers = null;
        }
        return;
      }
      const dir: -1 | 1 | null = v < -engage ? -1 : v > engage ? 1 : null;
      if (dir === null) return;

      engagedDir = dir;
      timers = armRepeat(() => handler(dir), opts);
    };

    this.stickPolls.add(poll);
    return () => {
      this.stickPolls.delete(poll);
      timers?.cancel();
    };
  }

  /** Ticked by Engine before SceneManager.update so handlers see fresh state. */
  public update(): void {
    for (const adapter of this.adapters) adapter.tick?.();
    for (const poll of this.stickPolls) poll();
  }

  private wireBindings() {
    for (const action of Object.keys(this.bindings) as ButtonAction[]) {
      for (const binding of this.bindings[action]) {
        for (const adapter of this.adapters) {
          const offDown = adapter.onButtonDown(binding, () => this.dispatch(this.downHandlers, action));
          const offUp = adapter.onButtonUp(binding, () => this.dispatch(this.upHandlers, action));
          if (offDown) this.deviceUnsubscribes.push(offDown);
          if (offUp) this.deviceUnsubscribes.push(offUp);
        }
      }
    }
  }

  private addHandler(map: HandlerMap, action: ButtonAction, handler: ActionHandler): () => void {
    let set = map.get(action);
    if (!set) {
      set = new Set();
      map.set(action, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  }

  private dispatch(map: HandlerMap, action: ButtonAction) {
    const handlers = map.get(action);
    if (!handlers) return;
    for (const handler of [...handlers]) handler();
  }
}

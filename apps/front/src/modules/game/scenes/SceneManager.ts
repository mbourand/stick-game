import type { Playable } from "../engine/animation/Playable";
import type { PersistentRoot } from "../engine/layers/PersistentRoot";
import type { TickContext } from "../engine/TickContext";
import type {
  TransitionFactory,
  TransitionKind,
} from "../engine/transitions/TransitionContext";
import type { Scene } from "./Scene";

type Listener = () => void;

/**
 * Snapshot of an in-flight scene transition. Both scenes update and render
 * while this is non-null; event-driven input is silent (SceneManager flips
 * `from` to "exiting" at start and `to` to "active" only at completion, so
 * neither scene has live input handlers during the choreography). Polled
 * input — sticks read inside Scene.update — is NOT silenced; scenes that
 * poll should check `isActive()` first.
 */
export type TransitionState = {
  readonly from: Scene | null;
  readonly to: Scene | null;
  readonly kind: TransitionKind;
};

export class SceneManager {
  private sceneStack: Scene[] = [];
  private listeners = new Set<Listener>();
  private isTransitioning = false;
  private transition: (TransitionState & { playable: Playable }) | null = null;

  constructor(private readonly persistentRoot: PersistentRoot) {}

  public subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getTopScene = (): Scene | null => {
    return this.sceneStack[this.sceneStack.length - 1] ?? null;
  };

  public getStack = (): readonly Scene[] => {
    return this.sceneStack;
  };

  public getTransition = (): TransitionState | null => {
    return this.transition;
  };

  /**
   * Push a scene with no transition animation. Intended for the initial
   * scene at app boot; subsequent navigation should use `transitionPush`
   * so both scenes can update/render across the choreography.
   */
  public pushScene(scene: Scene) {
    if (this.isTransitioning) return;
    const previous = this.getTopScene();
    previous?.setPhase("inactive");
    this.sceneStack.push(scene);
    scene.setPhase("active");
    this.emit();
  }

  /**
   * Push `scene` on top of the stack, choreographed by `factory`. Both the
   * outgoing top scene and the incoming `scene` update and render until the
   * choreography's Playable finishes. Then `scene` is added to the stack and
   * activated.
   */
  public async transitionPush(scene: Scene, factory: TransitionFactory): Promise<void> {
    const from = this.getTopScene();
    await this.runTransition({ from, to: scene, kind: "push", factory }, () => {
      this.sceneStack.push(scene);
    });
  }

  /**
   * Replace the top scene with `scene`, choreographed by `factory`. Both
   * scenes update and render during the transition; the previous top is
   * destroyed at completion.
   */
  public async transitionReplace(scene: Scene, factory: TransitionFactory): Promise<void> {
    const from = this.getTopScene();
    await this.runTransition({ from, to: scene, kind: "replace", factory }, () => {
      const previous = this.sceneStack.pop();
      if (previous) void previous.onDestroy();
      this.sceneStack.push(scene);
    });
  }

  /**
   * Pop the top scene, choreographed by `factory`. The popped scene and the
   * scene revealed beneath both update and render during the transition; the
   * popped scene is destroyed at completion.
   */
  public async transitionPop(factory: TransitionFactory): Promise<void> {
    const from = this.getTopScene();
    if (!from) return;
    const to = this.sceneStack[this.sceneStack.length - 2] ?? null;
    await this.runTransition({ from, to, kind: "pop", factory }, () => {
      this.sceneStack.pop();
      void from.onDestroy();
    });
  }

  private async runTransition(
    spec: { from: Scene | null; to: Scene | null; kind: TransitionKind; factory: TransitionFactory },
    finalize: () => void,
  ): Promise<void> {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // setPhase("exiting") fires onBeforeExit and tears down `from`'s input
    // handlers BEFORE the choreography plays, so the user can't drive a
    // scene that's animating out. Mid-timeline, the playable will call
    // setPhase("entering") on `to` (no side effect — not the active
    // boundary). When the playable finishes we commit to "inactive"/"active".
    spec.from?.setPhase("exiting");

    const playable = spec.factory({
      from: spec.from,
      to: spec.to,
      kind: spec.kind,
      circle: this.persistentRoot.circle,
    });

    this.transition = { from: spec.from, to: spec.to, kind: spec.kind, playable };
    this.emit();

    try {
      await this.persistentRoot.transitions.play(playable);
      finalize();
      spec.from?.setPhase("inactive");
      spec.to?.setPhase("active");
    } finally {
      this.transition = null;
      this.isTransitioning = false;
      this.emit();
    }
  }

  public clearScenes() {
    const top = this.getTopScene();
    top?.setPhase("inactive");
    for (let i = this.sceneStack.length - 1; i >= 0; i--) {
      void this.sceneStack[i].onDestroy();
    }
    this.sceneStack = [];
    this.emit();
  }

  public removeScene(scene: Scene) {
    const index = this.sceneStack.indexOf(scene);
    if (index === -1) return;

    const wasTop = index === this.sceneStack.length - 1;
    scene.setPhase("inactive");
    void scene.onDestroy();
    this.sceneStack.splice(index, 1);
    if (wasTop) this.getTopScene()?.setPhase("active");
    this.emit();
  }

  public update(tick: TickContext) {
    const t = this.transition;
    if (t) {
      t.from?.update(tick);
      if (t.to && t.to !== t.from) t.to.update(tick);
      return;
    }
    this.getTopScene()?.update(tick);
  }

  public render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const t = this.transition;
    const topIndex = this.sceneStack.length - 1;

    for (let i = 0; i < this.sceneStack.length; i++) {
      const scene = this.sceneStack[i];
      const forcedByTransition = t !== null && (t.from === scene || t.to === scene);
      if (i !== topIndex && !forcedByTransition && !scene.rendersWhenInactive) continue;
      scene.render(canvas, ctx);
    }

    // Push/replace transitions have a `to` scene that isn't in the stack yet —
    // render it on top so the choreography can show it coming in.
    if (t && t.to && !this.sceneStack.includes(t.to)) {
      t.to.render(canvas, ctx);
    }
  }

  private emit() {
    for (const listener of this.listeners) listener();
  }
}

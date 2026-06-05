import type { Engine } from "../../engine/Engine";
import type { TransitionFactory } from "../../engine/transitions/TransitionContext";
import { Scene } from "../Scene";
import { ProfileView } from "./ProfileView";

/**
 * Account screen: sign in with an OAuth provider, or — when logged in — edit
 * the username/avatar and sign out. A DOM-only scene (like Settings): all the
 * interaction lives in the React view, the scene just owns the back action and
 * the exit choreography its opener chose.
 */
export class ProfileScene extends Scene {
  public readonly id = "profile";
  public override readonly UI = ProfileView;

  private readonly exitFactory: TransitionFactory;

  constructor(engine: Engine, exitFactory: TransitionFactory) {
    super(engine);
    this.exitFactory = exitFactory;
  }

  public override onEntered() {
    this.onAction("back", () => this.close());
  }

  public close() {
    void this.sceneManager.transitionPop(this.exitFactory);
  }
}

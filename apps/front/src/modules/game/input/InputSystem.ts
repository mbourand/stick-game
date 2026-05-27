import type { Gamepad } from "../../gamepad/Gamepad";
import { DEFAULT_ACTION_BINDINGS, type ActionBindings, type ButtonAction } from "./actions";

type ActionHandler = () => void;
type HandlerMap = Map<ButtonAction, Set<ActionHandler>>;

export class InputSystem {
  private gamepad: Gamepad;
  private bindings: ActionBindings;

  private downHandlers: HandlerMap = new Map();
  private upHandlers: HandlerMap = new Map();
  private deviceUnsubscribes: (() => void)[] = [];

  constructor(gamepad: Gamepad, bindings: ActionBindings = DEFAULT_ACTION_BINDINGS) {
    this.gamepad = gamepad;
    this.bindings = bindings;
    this.wireBindings();
  }

  public destroy() {
    this.deviceUnsubscribes.forEach((off) => off());
    this.deviceUnsubscribes = [];
    this.downHandlers.clear();
    this.upHandlers.clear();
  }

  public onActionDown(action: ButtonAction, handler: ActionHandler): () => void {
    return this.addHandler(this.downHandlers, action, handler);
  }

  public onActionUp(action: ButtonAction, handler: ActionHandler): () => void {
    return this.addHandler(this.upHandlers, action, handler);
  }

  public getStick(side: "left" | "right"): { x: number; y: number } {
    return this.gamepad.getClampedStickPosition(side);
  }

  private wireBindings() {
    for (const action of Object.keys(this.bindings) as ButtonAction[]) {
      for (const binding of this.bindings[action]) {
        if (binding.device === "gamepad") {
          this.deviceUnsubscribes.push(
            this.gamepad.onButtonDown(binding.button, () => this.dispatch(this.downHandlers, action)),
            this.gamepad.onButtonUp(binding.button, () => this.dispatch(this.upHandlers, action)),
          );
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

import type { ButtonBinding } from "./actions";

/**
 * Uniform wrapper around an input device — gamepad, keyboard, touch, midi, …
 *
 * The InputSystem owns a list of adapters and asks each one to wire any
 * binding that belongs to it. An adapter that doesn't recognise a binding
 * returns `null` from its button hooks; that's the "not my problem" signal.
 *
 * Stickless devices (keyboard, mouse) return `null` from `getStick`.
 */
export interface InputDeviceAdapter {
  /** Discriminator that matches `ButtonBinding.device`. */
  readonly device: string;

  /** Subscribe to a button-down event for a binding. Return null if the binding isn't this device's. */
  onButtonDown(binding: ButtonBinding, handler: () => void): (() => void) | null;

  /** Subscribe to a button-up event for a binding. Return null if the binding isn't this device's. */
  onButtonUp(binding: ButtonBinding, handler: () => void): (() => void) | null;

  /** Current stick value if the device has one, else null. */
  getStick(side: "left" | "right"): { x: number; y: number } | null;

  /** Optional per-frame poll, called before handlers dispatch. */
  tick?(): void;

  destroy?(): void;
}

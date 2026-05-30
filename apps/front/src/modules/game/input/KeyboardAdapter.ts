import type { InputDeviceAdapter } from "./InputDeviceAdapter";

type Handler = () => void;
type HandlerMap = Map<string, Set<Handler>>;

/**
 * Window-level keyboard input adapter. Subscribers register against
 * `KeyboardEvent.key` values (e.g. "Enter", "Escape", "ArrowUp"); keydown
 * dispatches as button-down, keyup as button-up.
 *
 *   - Browser autorepeat events (`event.repeat`) are dropped so the
 *     InputSystem's `onActionRepeat` owns the repeat cadence — otherwise the
 *     OS would re-fire down-events every ~30ms and reset the InputSystem's
 *     own timer.
 *   - Keystrokes with a Ctrl/Alt/Meta modifier are ignored. Browser shortcuts
 *     (Ctrl+R, Ctrl+F, …) keep their priority and we don't accidentally bind
 *     to combos.
 *   - When a bound key fires, the adapter calls `preventDefault` *unless* the
 *     event target is a text-editing element (`<input>`, `<textarea>`,
 *     `contenteditable`). Inputs keep their normal key behavior (typing,
 *     caret nav, etc.); everywhere else, browser defaults like page-scroll
 *     on arrows or form-blur on Escape are squashed.
 *
 * Stickless; `getStick` always returns null.
 */
export function createKeyboardAdapter(): InputDeviceAdapter {
  const downHandlers: HandlerMap = new Map();
  const upHandlers: HandlerMap = new Map();

  const addHandler = (map: HandlerMap, key: string, handler: Handler) => {
    let set = map.get(key);
    if (!set) {
      set = new Set();
      map.set(key, set);
    }
    set.add(handler);
    return () => {
      set?.delete(handler);
    };
  };

  const dispatch = (map: HandlerMap, key: string): boolean => {
    const set = map.get(key);
    if (!set || set.size === 0) return false;
    for (const handler of [...set]) handler();
    return true;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (!dispatch(downHandlers, e.key)) return;
    if (!isTextEditingTarget(e.target)) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (!dispatch(upHandlers, e.key)) return;
    if (!isTextEditingTarget(e.target)) e.preventDefault();
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    device: "keyboard",
    onButtonDown(binding, handler) {
      if (binding.device !== "keyboard") return null;
      return addHandler(downHandlers, binding.key, handler);
    },
    onButtonUp(binding, handler) {
      if (binding.device !== "keyboard") return null;
      return addHandler(upHandlers, binding.key, handler);
    },
    getStick: () => null,
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      downHandlers.clear();
      upHandlers.clear();
    },
  };
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return true;
  return target.isContentEditable;
}

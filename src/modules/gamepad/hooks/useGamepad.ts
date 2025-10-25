import { useEffect, useRef } from "react";

export const useGamepad = () => {
  const currentGamepadIndex = useRef<number | null>(0);

  const getGamepad = () => {
    const gamepads = navigator.getGamepads();
    return (currentGamepadIndex.current && gamepads[currentGamepadIndex.current]) || null;
  };

  useEffect(() => {
    const ac = new AbortController();

    const onGamepadConnected = (e: GamepadEvent) => {
      console.log("Gamepad connected:", e.gamepad);
      currentGamepadIndex.current = e.gamepad.index;
    };

    const onGamepadDisconnected = (e: GamepadEvent) => {
      if (currentGamepadIndex.current === e.gamepad.index) {
        currentGamepadIndex.current = null;
      }
    };

    window.addEventListener("gamepadconnected", onGamepadConnected, { signal: ac.signal });
    window.addEventListener("gamepaddisconnected", onGamepadDisconnected, { signal: ac.signal });

    return () => {
      ac.abort();
    };
  }, []);

  return { getGamepad };
};

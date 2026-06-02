import { useEffect, useRef } from "react";
import type { FrameCallback } from "./Engine";
import { useEngine } from "./useEngine";

export function useFrame(callback: FrameCallback) {
  const engine = useEngine();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    return engine.registerFrameCallback((tick) => callbackRef.current(tick));
  }, [engine]);
}

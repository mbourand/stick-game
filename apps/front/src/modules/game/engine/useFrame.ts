import { useContext, useEffect, useRef } from "react";
import { EngineContext } from "./EngineContext";
import type { FrameCallback } from "./Engine";

export function useFrame(callback: FrameCallback) {
  const engine = useContext(EngineContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!engine) return;
    return engine.registerFrameCallback((tick) => callbackRef.current(tick));
  }, [engine]);
}

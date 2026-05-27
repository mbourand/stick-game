"use client";

import { useContext, useEffect, useRef } from "react";
import type { FrameCallback } from "./FrameDriver";
import { FrameDriverContext } from "./FrameDriverContext";

export function useFrame(callback: FrameCallback) {
  const driver = useContext(FrameDriverContext);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (!driver) return;
    return driver.register((deltaTime, time) => callbackRef.current(deltaTime, time));
  }, [driver]);
}

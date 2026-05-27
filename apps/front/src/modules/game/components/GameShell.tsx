"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Engine } from "../engine/Engine";
import { EngineContext } from "../engine/EngineContext";
import { MainMenuScene } from "../scenes/MainMenu/MainMenuScene";
import { useTopScene } from "../scenes/useScene";

export const GameShell = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);

  const onResize = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    window.addEventListener("resize", onResize, { signal: ac.signal });
    onResize();
    return () => ac.abort();
  }, [onResize]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const instance = new Engine();
    instance.start(canvasRef.current);
    instance.getSceneManager().pushScene(new MainMenuScene(instance));
    setEngine(instance);

    return () => {
      instance.stop();
    };
  }, []);

  return (
    <EngineContext.Provider value={engine}>
      <canvas ref={canvasRef} />
      <div className="absolute inset-0 pointer-events-none">
        {engine && <SceneUIOverlay engine={engine} />}
      </div>
    </EngineContext.Provider>
  );
};

const SceneUIOverlay = ({ engine }: { engine: Engine }) => {
  const scene = useTopScene(engine.getSceneManager());
  const UI = scene?.UI ?? null;

  return (
    <AnimatePresence mode="wait">
      {scene && UI && (
        <motion.div
          key={scene.id}
          className="absolute inset-0 pointer-events-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <UI scene={scene} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Engine } from "../engine/Engine";
import { EngineContext } from "../engine/EngineContext";
import { MainMenuScene } from "../scenes/MainMenu/MainMenuScene";
import type { Scene } from "../scenes/Scene";
import { useTopScene, useTransition } from "../scenes/useScene";

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
  const topScene = useTopScene(engine.getSceneManager());
  const transition = useTransition(engine.getSceneManager());

  // While a programmatic transition is in flight, mount both the outgoing
  // and incoming scenes' UIs as raw siblings so each can drive its own
  // DOM-side choreography (button retract, content fade, ...) without
  // interference from a wrapper animation.
  if (transition) {
    return (
      <>
        <SceneUIMount scene={transition.from} />
        {transition.to !== transition.from && <SceneUIMount scene={transition.to} />}
      </>
    );
  }

  // No transition active: cross-fade between top scenes on instant swaps.
  // `initial={false}` skips the fade-in for the freshly-mounted top so we
  // never re-fade a scene that was already visible during a transition.
  return (
    <AnimatePresence>
      {topScene && topScene.UI && (
        <motion.div
          key={topScene.id}
          className="absolute inset-0 pointer-events-auto"
          initial={false}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <topScene.UI scene={topScene} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const SceneUIMount = ({ scene }: { scene: Scene | null }) => {
  if (!scene || !scene.UI) return null;
  const UI = scene.UI;
  return (
    <div className="absolute inset-0 pointer-events-auto">
      <UI scene={scene} />
    </div>
  );
};

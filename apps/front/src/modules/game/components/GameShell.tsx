"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Game } from "../Game";
import { FrameDriverContext } from "../frame/FrameDriverContext";
import { useTopScene } from "../scenes/useScene";

export const GameShell = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const [game, setGame] = useState<Game | null>(null);

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

    let cancelled = false;

    const afterTick = () => {
      if (cancelled) return;
      rafIdRef.current = requestAnimationFrame(instance.tick.bind(instance));
    };

    const instance = new Game(afterTick);

    void instance.start(canvasRef.current).then(() => {
      if (cancelled) return;
      setGame(instance);
      instance.tick();
    });

    return () => {
      cancelled = true;
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
      instance.destroy();
    };
  }, []);

  return (
    <FrameDriverContext.Provider value={game?.getFrameDriver() ?? null}>
      <canvas ref={canvasRef} />
      <div className="absolute inset-0 pointer-events-none">
        {game && <SceneUIOverlay game={game} />}
      </div>
    </FrameDriverContext.Provider>
  );
};

const SceneUIOverlay = ({ game }: { game: Game }) => {
  const scene = useTopScene(game.getSceneManager());
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

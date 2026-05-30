"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScenePresenceProvider } from "../engine/animation/scenePresence";
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
    instance.sceneManager.pushScene(new MainMenuScene(instance));
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

/**
 * Renders the UI for whichever scene(s) are visible right now: the top scene
 * normally, or both from + to during a programmatic transition.
 *
 * Crucially, we render every visible scene with a stable React key in the SAME
 * tree position in both branches — that way the `to` scene's React subtree
 * isn't unmounted and remounted at the transition→post-transition boundary,
 * which would otherwise replay its entrance animation a second time.
 */
const SceneUIOverlay = ({ engine }: { engine: Engine }) => {
  const topScene = useTopScene(engine.sceneManager);
  const transition = useTransition(engine.sceneManager);

  const scenes: Scene[] = [];
  if (transition) {
    if (transition.from) scenes.push(transition.from);
    if (transition.to && transition.to !== transition.from) scenes.push(transition.to);
  } else if (topScene) {
    scenes.push(topScene);
  }

  return (
    <>
      {scenes.map((scene) => {
        if (!scene.UI) return null;
        const UI = scene.UI;
        return (
          <div key={scene.id} className="absolute inset-0 pointer-events-auto">
            <ScenePresenceProvider scene={scene}>
              <UI scene={scene} />
            </ScenePresenceProvider>
          </div>
        );
      })}
    </>
  );
};

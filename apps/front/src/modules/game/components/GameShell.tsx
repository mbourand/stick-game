import { useEffect, useRef, useState } from "react";
import { ScenePresenceProvider } from "../engine/animation/scenePresence";
import { Engine } from "../engine/Engine";
import { EngineContext } from "../engine/EngineContext";
import { MainMenuScene } from "../scenes/MainMenu/MainMenuScene";
import type { Scene } from "../scenes/Scene";
import { useTopScene, useTransition } from "../scenes/useScene";
import { ensureBackgroundLayer } from "../BackgroundLayer";
import { ensureNowPlaying } from "../nowPlaying";
import { ensureSharedCircle } from "../sharedCircle";
import { FirstRunImportOverlay } from "./FirstRunImportOverlay";
import { GamepadToast } from "./GamepadToast";
import { MigrationOverlay } from "./MigrationOverlay";

export const GameShell = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const instance = new Engine();
    // Engine.start sizes the canvas to the viewport (with dpr) and keeps it in
    // sync on resize, so the shell no longer manages canvas dimensions.
    instance.start(canvasRef.current);
    ensureSharedCircle(instance);
    ensureBackgroundLayer(instance);
    ensureNowPlaying(instance);
    instance.sceneManager.pushScene(new MainMenuScene(instance));
    setEngine(instance);

    return () => {
      instance.stop();
    };
  }, []);

  // The canvas always renders (the effect needs it to start the engine). The
  // EngineContext subtree mounts only once the engine exists, so the provider
  // value — and every consumer below it — is guaranteed non-null. That's why
  // useEngine/useViewport/useFrame can assume a live Engine instead of each
  // branching on null.
  return (
    <>
      <canvas ref={canvasRef} />
      {engine && (
        <EngineContext.Provider value={engine}>
          <div className="absolute inset-0 pointer-events-none">
            <SceneUIOverlay engine={engine} />
            <GamepadToast engine={engine} />
          </div>
          <FirstRunImportOverlay engine={engine} />
          <MigrationOverlay engine={engine} />
        </EngineContext.Provider>
      )}
    </>
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

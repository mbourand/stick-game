import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { type ParsedMap } from "../../convert/OsuConverter";
import { Game } from "../Game";
import type { GamepadAxisKind, GamepadAxisMapping } from "../../gamepad/mapping/types";
import { Gamepad } from "../../gamepad/Gamepad";

type GameCanvasProps = {
  parsedMap: ParsedMap;
  scrollSpeed: number;
  gamepadMapping: Record<GamepadAxisKind, GamepadAxisMapping>;
};

export const GameCanvas = ({ parsedMap, scrollSpeed, gamepadMapping }: GameCanvasProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const requestAnimationFrameId = useRef<number | null>(null);
  const gamepad = useRef(new Gamepad(gamepadMapping));

  const gameRef = useRef<Game | null>(null);

  const onResize = useCallback(() => {
    if (!ref.current) return;

    ref.current.width = window.innerWidth;
    ref.current.height = window.innerHeight;
  }, []);

  useEffect(() => {
    gamepad.current.setMapping(gamepadMapping);
  }, [gamepadMapping]);

  useEffect(() => {
    const ac = new AbortController();
    window.addEventListener("resize", onResize, { signal: ac.signal });
    onResize();
    return () => ac.abort();
  }, [onResize]);

  const destroyGame = useEffectEvent(() => {
    if (requestAnimationFrameId.current) cancelAnimationFrame(requestAnimationFrameId.current);
    gameRef.current!.destroy();
  });

  useEffect(() => {
    if (!ref.current) return;

    const afterTick = () => {
      if (!gameRef.current) return;
      requestAnimationFrameId.current = requestAnimationFrame(gameRef.current.tick.bind(gameRef.current));
    };

    const start = async () => {
      if (!ref.current) return;

      gameRef.current = new Game(afterTick, scrollSpeed, gamepad.current);
      gameRef.current.reset();
      await gameRef.current.loadBeatmap(parsedMap);
      await gameRef.current.start(ref.current);
      gameRef.current.tick();
    };

    start();
    return () => destroyGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destroyGame, parsedMap]);

  useEffect(() => {
    gameRef.current?.setScrollSpeed(scrollSpeed);
  }, [scrollSpeed]);

  return <canvas ref={ref} />;
};

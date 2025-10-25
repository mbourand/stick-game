import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { type ParsedMap } from "../../convert/OsuConverter";
import { Game } from "../Game";

type GameCanvasProps = {
  parsedMap: ParsedMap;
  scrollSpeed: number;
};

export const GameCanvas = ({ parsedMap, scrollSpeed }: GameCanvasProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const requestAnimationFrameId = useRef<number | null>(null);
  const gameRef = useRef<Game | null>(null);

  const onResize = useCallback(() => {
    if (!ref.current) return;

    ref.current.width = window.innerWidth;
    ref.current.height = (window.innerWidth * 9) / 16;
  }, []);

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

      gameRef.current = new Game(afterTick, scrollSpeed);
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

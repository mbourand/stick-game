import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Game } from "../Game";

export const GameCanvas = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  const requestAnimationFrameId = useRef<number | null>(null);

  const gameRef = useRef<Game | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);

  const onResize = useCallback(() => {
    if (!ref.current) return;

    ref.current.width = window.innerWidth;
    ref.current.height = window.innerHeight;
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    window.addEventListener("resize", onResize, { signal: ac.signal });
    onResize();
    return () => ac.abort();
  }, [onResize]);

  const destroyGame = useEffectEvent(() => {
    if (requestAnimationFrameId.current) cancelAnimationFrame(requestAnimationFrameId.current);
    setIsPlaying(false);
  });

  const startGame = useCallback(async () => {
    if (!ref.current) return;

    const afterTick = () => {
      if (!gameRef.current) return;
      requestAnimationFrameId.current = requestAnimationFrame(gameRef.current.tick.bind(gameRef.current));
    };

    gameRef.current = new Game(afterTick);
    if (isPlaying) return;
    await gameRef.current.start(ref.current);
    console.log(gameRef.current?.getUI());
    setIsPlaying(true);

    gameRef.current.tick();
  }, [isPlaying]);

  useEffect(() => {
    startGame();
    return () => destroyGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas ref={ref} />
      <div className="absolute inset-0">{gameRef.current?.getUI()}</div>
    </>
  );
};

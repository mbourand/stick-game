import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { type ParsedMap } from "../../osu/convert/OsuConverter";
import { Game } from "../Game";

type GameCanvasProps = {
  parsedMap: ParsedMap;
};

export const GameCanvas = ({ parsedMap }: GameCanvasProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const requestAnimationFrameId = useRef<number | null>(null);

  const gameRef = useRef<Game | null>(null);

  const isPlaying = useRef(false);

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
    isPlaying.current = false;
  });

  const startGame = useEffectEvent(async () => {
    if (!ref.current) return;

    const afterTick = () => {
      if (!gameRef.current) return;
      requestAnimationFrameId.current = requestAnimationFrame(gameRef.current.tick.bind(gameRef.current));
    };

    gameRef.current = new Game(afterTick);
    if (isPlaying.current) return;
    await gameRef.current.start(ref.current);
    isPlaying.current = true;

    gameRef.current.tick();
  });

  useEffect(() => {
    startGame();
    return () => destroyGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.setParsedMap(parsedMap);
  }, [parsedMap]);

  return <canvas ref={ref} />;
};

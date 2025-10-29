import { useCallback, useEffect, useEffectEvent, useRef } from "react";
import { type ParsedMap } from "../../osu/convert/OsuConverter";
import { Game } from "../Game";
import { Gamepad } from "../../gamepad/Gamepad";
import { Settings } from "../../settings/Settings";

type GameCanvasProps = {
  parsedMap: ParsedMap;
};

export const GameCanvas = ({ parsedMap }: GameCanvasProps) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const requestAnimationFrameId = useRef<number | null>(null);
  const gamepad = useRef(new Gamepad(Settings.getSettings().gamepadMapping));

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
    gameRef.current!.destroy();
    isPlaying.current = false;
  });

  const startGame = useEffectEvent(async () => {
    if (!ref.current) return;

    const afterTick = () => {
      if (!gameRef.current) return;
      requestAnimationFrameId.current = requestAnimationFrame(gameRef.current.tick.bind(gameRef.current));
    };

    console.log("Starting game with settings:", Settings.getSettings());

    gameRef.current = new Game(afterTick, gamepad.current, Settings.getSettings());
    await gameRef.current.loadBeatmap(parsedMap);
    if (isPlaying.current) return;
    await gameRef.current.start(ref.current);
    isPlaying.current = true;

    gameRef.current.tick();
  });

  useEffect(() => {
    const offSettingChanged = Settings.getEventManager().on("onSettingChanged", () => {
      destroyGame();
      startGame();
    });

    return () => {
      offSettingChanged();
    };
  }, [destroyGame, startGame]);

  useEffect(() => {
    if (!ref.current) return;

    startGame();
    return () => destroyGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destroyGame, parsedMap]);

  return <canvas ref={ref} />;
};

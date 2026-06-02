import { motion } from "motion/react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { RATE_DEFAULT, RATE_MAX, RATE_MIN, RATE_STEP, getScoreMultiplier, isModded } from "../../mods/mods";
import { HintBar } from "../shared/KeyHint";
import type { SceneUIComponent } from "../Scene";
import type { ModsScene } from "./ModsScene";

/** Quick-jump rate presets shown as chips beneath the slider. */
const RATE_PRESETS = [0.5, 0.75, 1, 1.5, 2] as const;

/** Cool for slower-than-normal (easier), white at ×1.0, warm/amber for faster (harder). */
function rateColor(rate: number): string {
  if (rate === RATE_DEFAULT) return "#ffffff";
  return rate > RATE_DEFAULT ? "#fbbf24" : "#7dd3fc";
}

export const ModsView: SceneUIComponent<ModsScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));
  const hintMotion = useScenePresenceMotion(fade({ y: 12 }));
  const { scale } = useViewport();
  const mods = useStore(scene.mods);
  const active = isModded(mods);
  const multiplier = getScoreMultiplier(mods);
  const color = rateColor(mods.rate);
  const toPct = (rate: number) => ((rate - RATE_MIN) / (RATE_MAX - RATE_MIN)) * 100;
  const fillPct = toPct(mods.rate);
  // ×1.0 isn't the slider's midpoint (range is 0.5–2.0), so anchor the tick +
  // "Normal" label to its real position rather than the visual center.
  const normalPct = toPct(RATE_DEFAULT);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="w-[480px] flex flex-col text-white rounded-2xl border border-white/10 bg-linear-to-b from-white/6 to-white/1 shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden"
          {...panelMotion}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="text-xl tracking-[0.3em] uppercase">Mods</h2>
            <button
              type="button"
              onClick={() => scene.close()}
              className="text-[10px] uppercase tracking-[0.3em] px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
            >
              Close
            </button>
          </div>

          <section className="px-6 py-6 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <h3 className="text-xs tracking-[0.3em] uppercase text-white/70">Rate</h3>
                <span className="text-[10px] tracking-[0.2em] uppercase text-white/35">Playback speed</span>
              </div>
              {active && (
                <button
                  type="button"
                  onClick={() => scene.reset()}
                  className="text-[10px] tracking-[0.25em] uppercase text-white/55 hover:text-white transition-colors"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Hero readout: −/+ steppers flanking the big, color-coded rate. */}
            <div className="flex items-center justify-center gap-6">
              <StepButton label="−" onClick={() => scene.stepRate(-1)} disabled={mods.rate <= RATE_MIN} />
              <div className="flex flex-col items-center min-w-37.5">
                <span
                  className="text-5xl font-bold tabular-nums leading-none transition-colors"
                  style={{ color, textShadow: `0 0 28px ${color}55` }}
                >
                  ×{mods.rate.toFixed(2)}
                </span>
                <span
                  className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] uppercase tracking-[0.25em]"
                  style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
                >
                  Score ×{multiplier.toFixed(2)}
                </span>
              </div>
              <StepButton label="+" onClick={() => scene.stepRate(1)} disabled={mods.rate >= RATE_MAX} />
            </div>

            <div>
              <div className="relative h-6 flex items-center">
                <div className="absolute w-full h-1.5 rounded-full bg-white/12" />
                <div
                  className="absolute h-1.5 rounded-full"
                  style={{ width: `${fillPct}%`, background: `linear-gradient(90deg, ${color}66, ${color})` }}
                />
                {/* ×1.0 marker. */}
                <div className="absolute w-0.5 h-3 -translate-x-1/2 bg-white/30 rounded-full" style={{ left: `${normalPct}%` }} />
                <input
                  type="range"
                  min={RATE_MIN}
                  max={RATE_MAX}
                  step={RATE_STEP}
                  value={mods.rate}
                  onChange={(e) => scene.setRate(Number(e.target.value))}
                  className={SLIDER_INPUT_CLASS}
                  aria-label="Playback rate"
                />
              </div>
              <div className="relative mt-2 h-3 text-[9px] uppercase tracking-[0.25em] text-white/35">
                <span className="absolute left-0">Easier</span>
                <span className="absolute -translate-x-1/2" style={{ left: `${normalPct}%` }}>
                  Normal
                </span>
                <span className="absolute right-0">Harder</span>
              </div>
            </div>

            {/* Quick presets. */}
            <div className="flex justify-center gap-2">
              {RATE_PRESETS.map((preset) => {
                const selected = mods.rate === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => scene.setRate(preset)}
                    className={`px-3 py-1.5 rounded-md text-xs tabular-nums tracking-wider transition-colors ${
                      selected ? "bg-white/90 text-black" : "bg-white/8 text-white/70 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    ×{preset.toFixed(preset % 1 === 0 ? 0 : 2)}
                  </button>
                );
              })}
            </div>
          </section>
        </motion.div>

        <motion.div className="mt-8 text-[10px] text-white/40 tracking-[0.3em] uppercase" {...hintMotion}>
          <HintBar items={[{ key: "←/→", label: "Adjust rate" }, { key: "B", label: "Close" }]} />
        </motion.div>
      </div>
    </motion.div>
  );
};

const StepButton = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-10 h-10 rounded-full border border-white/15 bg-white/5 text-2xl leading-none flex items-center justify-center text-white/80 hover:bg-white/15 hover:text-white disabled:opacity-25 disabled:hover:bg-white/5 transition-colors"
  >
    {label}
  </button>
);

const SLIDER_INPUT_CLASS = [
  "absolute w-full appearance-none bg-transparent pointer-events-none m-0 outline-none",
  "[&::-webkit-slider-thumb]:appearance-none",
  "[&::-webkit-slider-thumb]:w-5",
  "[&::-webkit-slider-thumb]:h-5",
  "[&::-webkit-slider-thumb]:rounded-full",
  "[&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:border-2",
  "[&::-webkit-slider-thumb]:border-black/40",
  "[&::-webkit-slider-thumb]:pointer-events-auto",
  "[&::-webkit-slider-thumb]:cursor-pointer",
  "[&::-webkit-slider-thumb]:shadow-md",
  "[&::-moz-range-thumb]:appearance-none",
  "[&::-moz-range-thumb]:w-5",
  "[&::-moz-range-thumb]:h-5",
  "[&::-moz-range-thumb]:rounded-full",
  "[&::-moz-range-thumb]:bg-white",
  "[&::-moz-range-thumb]:border-2",
  "[&::-moz-range-thumb]:border-black/40",
  "[&::-moz-range-thumb]:pointer-events-auto",
  "[&::-moz-range-thumb]:cursor-pointer",
  "[&::-moz-range-thumb]:shadow-md",
].join(" ");

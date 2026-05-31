import { motion } from "motion/react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { difficultyColor, difficultyGradientCss } from "../shared/difficultyColor";
import type { SceneUIComponent } from "../Scene";
import type { FilterScene } from "./FilterScene";
import { DIFFICULTY_SLIDER_MAX, type DifficultyFilter } from "./filterTypes";

const DIFFICULTY_BOUNDS = { min: 0, max: DIFFICULTY_SLIDER_MAX } as const;

export const FilterView: SceneUIComponent<FilterScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));
  const hintMotion = useScenePresenceMotion(fade({ y: 12 }));
  const { scale } = useViewport();
  const difficultyFilter = useStore(scene.difficultyFilter);
  const current = difficultyFilter ?? DIFFICULTY_BOUNDS;
  const isActive = difficultyFilter !== null;
  const maxIsInfinite = current.max >= DIFFICULTY_SLIDER_MAX;

  const setFilter = (f: DifficultyFilter | null) => scene.difficultyFilter.set(f);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="w-[480px] flex flex-col gap-8 text-white p-6 rounded border border-white/10 bg-white/[0.02]"
          {...panelMotion}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-2xl tracking-[0.3em] uppercase">Filters</h2>
            <button
              type="button"
              onClick={() => scene.close()}
              className="text-[10px] uppercase tracking-[0.3em] px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded"
            >
              Close
            </button>
          </div>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs tracking-[0.3em] uppercase text-white/70">Difficulty</h3>
              {isActive && (
                <button
                  type="button"
                  onClick={() => setFilter(null)}
                  className="text-[10px] tracking-[0.25em] uppercase text-white/60 hover:text-white underline"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="text-center text-base tracking-wider mb-4 tabular-nums">
              <span style={{ color: difficultyColor(current.min) }}>{current.min.toFixed(1)} ★</span>
              <span className="text-white/40"> — </span>
              {maxIsInfinite ? (
                <span style={{ color: difficultyColor(DIFFICULTY_SLIDER_MAX) }}>10+ ★</span>
              ) : (
                <span style={{ color: difficultyColor(current.max) }}>{current.max.toFixed(1)} ★</span>
              )}
            </div>

            <DualRangeSlider
              min={DIFFICULTY_BOUNDS.min}
              max={DIFFICULTY_BOUNDS.max}
              step={0.1}
              value={current}
              onChange={setFilter}
            />

            <div className="flex justify-between mt-2 text-[10px] tabular-nums tracking-[0.2em]">
              <span style={{ color: difficultyColor(DIFFICULTY_BOUNDS.min) }}>
                {DIFFICULTY_BOUNDS.min.toFixed(1)} ★
              </span>
              <span style={{ color: difficultyColor(DIFFICULTY_SLIDER_MAX) }}>{DIFFICULTY_SLIDER_MAX}+ ★</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <NumberField
                label="Min"
                value={current.min}
                min={DIFFICULTY_BOUNDS.min}
                max={current.max}
                step={0.1}
                onChange={(v) =>
                  setFilter({
                    min: clamp(v, DIFFICULTY_BOUNDS.min, current.max),
                    max: current.max,
                  })
                }
              />
              <NumberField
                label="Max"
                value={current.max}
                min={current.min}
                max={DIFFICULTY_BOUNDS.max}
                step={0.1}
                onChange={(v) =>
                  setFilter({
                    min: current.min,
                    max: clamp(v, current.min, DIFFICULTY_BOUNDS.max),
                  })
                }
              />
            </div>
          </section>
        </motion.div>

        <motion.div className="mt-8 text-[10px] text-white/40 tracking-[0.3em] uppercase" {...hintMotion}>
          <KeyHint label="B" /> Close
        </motion.div>
      </div>
    </motion.div>
  );
};

type DualRangeSliderProps = {
  min: number;
  max: number;
  step: number;
  value: { min: number; max: number };
  onChange: (v: { min: number; max: number }) => void;
};

const DualRangeSlider = ({ min, max, step, value, onChange }: DualRangeSliderProps) => {
  const range = max - min;
  const minPct = range > 0 ? ((value.min - min) / range) * 100 : 0;
  const maxPct = range > 0 ? ((value.max - min) / range) * 100 : 100;

  return (
    <div className="relative h-6 flex items-center">
      {/* The full difficulty spectrum, so the track reads as the scale itself.
          Anchored to the slider's own 0–DIFFICULTY_SLIDER_MAX range so the
          colors line up with the thumbs and the dim window below. */}
      <div
        className="absolute w-full h-1.5 rounded-full"
        style={{ background: difficultyGradientCss("to right", DIFFICULTY_SLIDER_MAX) }}
      />
      {/* Dim the spectrum outside the selected [min, max] window. */}
      <div className="absolute left-0 h-1.5 bg-black/55 rounded-l-full" style={{ width: `${minPct}%` }} />
      <div className="absolute right-0 h-1.5 bg-black/55 rounded-r-full" style={{ width: `${100 - maxPct}%` }} />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value.min}
        onChange={(e) => onChange({ min: Math.min(Number(e.target.value), value.max), max: value.max })}
        className={SLIDER_INPUT_CLASS}
        aria-label="Minimum difficulty"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value.max}
        onChange={(e) => onChange({ min: value.min, max: Math.max(Number(e.target.value), value.min) })}
        className={SLIDER_INPUT_CLASS}
        aria-label="Maximum difficulty"
      />
    </div>
  );
};

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

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
};

const NumberField = ({ label, value, min, max, step, onChange }: NumberFieldProps) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">{label}</span>
    <input
      type="number"
      value={Number.isFinite(value) ? value.toFixed(1) : ""}
      min={min}
      max={max}
      step={step}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(v);
      }}
      className="bg-white/10 border border-white/20 text-white text-sm px-3 py-2 rounded focus:bg-white/20 focus:border-white/60 outline-none tabular-nums"
    />
  </label>
);

const KeyHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 mr-2 rounded border border-white/30 text-[10px] font-bold tracking-wider text-white/70 align-middle"
    aria-hidden
  >
    {label}
  </span>
);

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

import { Modal } from "@/components/Modal";

export type DifficultyFilter = { min: number; max: number };

/**
 * Upper bound of the difficulty slider. When the max thumb is parked here we
 * treat the filter as having no upper limit (∞), so beatmaps above this rating
 * still pass.
 */
export const DIFFICULTY_SLIDER_MAX = 10;

const DIFFICULTY_BOUNDS = { min: 0, max: DIFFICULTY_SLIDER_MAX } as const;

type BeatmapFiltersProps = {
  isVisible: boolean;
  onClose: () => void;
  difficultyFilter: DifficultyFilter | null;
  onDifficultyChange: (filter: DifficultyFilter | null) => void;
};

export const BeatmapFilters = ({
  isVisible,
  onClose,
  difficultyFilter,
  onDifficultyChange,
}: BeatmapFiltersProps) => {
  const current = difficultyFilter ?? DIFFICULTY_BOUNDS;
  const isDifficultyActive = difficultyFilter !== null;
  const maxIsInfinite = current.max >= DIFFICULTY_SLIDER_MAX;

  return (
    <Modal isVisible={isVisible} onClose={onClose} rounded={false}>
      <div className="w-120 flex flex-col gap-8" style={{ fontFamily: "Rostex" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl tracking-[0.3em] uppercase">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-xs uppercase tracking-[0.25em] px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded"
          >
            Close
          </button>
        </div>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm tracking-[0.25em] uppercase text-white/70">Difficulty</h3>
            {isDifficultyActive && (
              <button
                type="button"
                onClick={() => onDifficultyChange(null)}
                className="text-xs tracking-wider text-white/60 hover:text-white underline"
              >
                Reset
              </button>
            )}
          </div>

          <div className="text-center text-base text-white tracking-wider mb-4 tabular-nums">
            {current.min.toFixed(1)} ★ — {maxIsInfinite ? "∞" : `${current.max.toFixed(1)} ★`}
          </div>

          <DualRangeSlider
            min={DIFFICULTY_BOUNDS.min}
            max={DIFFICULTY_BOUNDS.max}
            step={0.1}
            value={current}
            onChange={onDifficultyChange}
          />

          <div className="flex justify-between mt-2 text-xs text-white/40 tabular-nums">
            <span>{DIFFICULTY_BOUNDS.min.toFixed(1)} ★</span>
            <span>{DIFFICULTY_SLIDER_MAX}+ ★</span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <NumberField
              label="Min"
              value={current.min}
              min={DIFFICULTY_BOUNDS.min}
              max={current.max}
              step={0.1}
              onChange={(v) =>
                onDifficultyChange({
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
                onDifficultyChange({
                  min: current.min,
                  max: clamp(v, current.min, DIFFICULTY_BOUNDS.max),
                })
              }
            />
          </div>
        </section>
      </div>
    </Modal>
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
      <div className="absolute w-full h-1.5 bg-white/15 rounded-full" />
      <div
        className="absolute h-1.5 bg-white/70 rounded-full"
        style={{ left: `${minPct}%`, width: `${Math.max(0, maxPct - minPct)}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value.min}
        onChange={(e) =>
          onChange({ min: Math.min(Number(e.target.value), value.max), max: value.max })
        }
        className={SLIDER_INPUT_CLASS}
        aria-label="Minimum difficulty"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value.max}
        onChange={(e) =>
          onChange({ min: value.min, max: Math.max(Number(e.target.value), value.min) })
        }
        className={SLIDER_INPUT_CLASS}
        aria-label="Maximum difficulty"
      />
    </div>
  );
};

/**
 * Tailwind arbitrary-selector classes that strip the native range-input chrome
 * (track, focus outline) and style only the thumb. Track is invisible — the
 * coloured bar behind the inputs is the visible track. `pointer-events-none`
 * on the input + `pointer-events-auto` on the thumb means clicks on the bare
 * track fall through to whichever input's thumb is closer.
 */
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
    <span className="text-xs uppercase tracking-[0.2em] text-white/50">{label}</span>
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

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

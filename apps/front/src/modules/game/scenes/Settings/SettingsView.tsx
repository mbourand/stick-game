import { motion } from "motion/react";
import { Fragment } from "react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { useViewport } from "../../engine/state/useViewport";
import { useSettings } from "../../engine/state/useSettings";
import { useGlobalTypeahead } from "../BeatmapSelection/useGlobalTypeahead";
import type { SceneUIComponent } from "../Scene";
import type { GamepadOption, SettingsScene } from "./SettingsScene";
import type { SettingsRow, SliderRow, TextRow } from "./fields";

export const SettingsView: SceneUIComponent<SettingsScene> = ({ scene }) => {
  const backdropMotion = useScenePresenceMotion(fade());
  const panelMotion = useScenePresenceMotion(fade({ y: 12 }));
  const hintMotion = useScenePresenceMotion(fade({ y: 12 }));

  const focused = useStore(scene.focused);
  const isEditingText = useStore(scene.isEditingText);
  const liveSettings = useSettings();
  const gamepadOptions = useStore(scene.gamepadOptions);
  const { scale } = useViewport();

  // Player-name typeahead. Active only while a text row is in edit mode.
  // Letters/digits append, Backspace pops — Escape/Enter exit edit mode
  // through the InputSystem's back/confirm actions, not this hook. The scene
  // owns the actual mutation so the view doesn't reach for engine.settings.
  useGlobalTypeahead((updater) => scene.applyTypingToFocusedTextRow(updater), { disabled: !isEditingText });

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md select-none"
      style={{ fontFamily: "Rostex" }}
      {...backdropMotion}
    >
      <div className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
        <motion.div
          className="w-[560px] flex flex-col text-white p-7 rounded border border-white/10 bg-white/[0.02]"
          {...panelMotion}
        >
          <header className="mb-6">
            <h2 className="text-2xl tracking-[0.35em] uppercase">Settings</h2>
          </header>

          <ul className="flex flex-col gap-1.5">
            {scene.rows.map((row, i) => {
              const showHeader = i === 0 || scene.rows[i - 1].section !== row.section;
              return (
                <Fragment key={row.id}>
                  {showHeader && <SectionHeader title={row.section} first={i === 0} />}
                  <SettingsRowItem
                    row={row}
                    index={i}
                    isFocused={focused === i}
                    isEditing={isEditingText && focused === i && row.kind === "text"}
                    liveSettings={liveSettings}
                    gamepadOptions={gamepadOptions}
                    onFocus={() => scene.setFocused(i)}
                  />
                </Fragment>
              );
            })}
          </ul>
        </motion.div>

        <motion.div
          className="mt-7 flex items-center gap-5 text-[11px] text-white/40 tracking-[0.35em] uppercase"
          {...hintMotion}
        >
          <span>
            <KeyHint label="↑↓" /> Navigate
          </span>
          <span className="text-white/20">|</span>
          <span>
            <KeyHint label="←→" /> Adjust
          </span>
          <span className="text-white/20">|</span>
          <span>
            <KeyHint label="A" /> {isEditingText ? "Done" : "Edit"}
          </span>
          <span className="text-white/20">|</span>
          <span>
            <KeyHint label="B" /> Back
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

const SectionHeader = ({ title, first }: { title: string; first: boolean }) => (
  <li
    className={`px-1 mb-0.5 text-[10px] tracking-[0.35em] uppercase text-white/35 pointer-events-none ${first ? "" : "mt-4"}`}
    aria-hidden
  >
    {title}
  </li>
);

type RowItemProps = {
  row: SettingsRow;
  index: number;
  isFocused: boolean;
  isEditing: boolean;
  liveSettings: ReturnType<typeof useSettings>;
  gamepadOptions: readonly GamepadOption[];
  onFocus: () => void;
};

const SettingsRowItem = ({ row, index, isFocused, isEditing, liveSettings, gamepadOptions, onFocus }: RowItemProps) => {
  const presenceMotion = useScenePresenceMotion({ ...fade({ y: 10 }), enterDelay: 0.05 + index * 0.04 });
  return (
    <motion.li
      className={`
        relative flex items-center justify-between h-12 rounded-md px-4 border pointer-events-auto
        text-sm transition-colors duration-150
        ${
          isFocused
            ? "bg-white/15 border-white/70 shadow-[0_0_22px_rgba(255,255,255,0.10)]"
            : "bg-white/[0.04] border-white/15 hover:bg-white/10"
        }
      `}
      onMouseEnter={onFocus}
      {...presenceMotion}
    >
      <span className="text-[12px] tracking-[0.3em] uppercase text-white/80">{row.label}</span>
      <div className="flex items-center gap-3 text-white">
        {row.kind === "slider" && <SliderControl row={row} value={row.read(liveSettings)} isFocused={isFocused} />}
        {row.kind === "text" && (
          <TextControl row={row} value={row.read(liveSettings)} isFocused={isFocused} isEditing={isEditing} />
        )}
        {row.kind === "gamepad" && (
          <GamepadControl selected={liveSettings.selectedGamepadIndex} options={gamepadOptions} isFocused={isFocused} />
        )}
      </div>
    </motion.li>
  );
};

const SliderControl = ({ row, value, isFocused }: { row: SliderRow; value: number; isFocused: boolean }) => {
  const pct = ((value - row.min) / (row.max - row.min)) * 100;
  const formatted = row.format?.(value) ?? String(value);
  return (
    <div className="flex items-center gap-3">
      <ArrowHint dir="left" visible={isFocused && value > row.min} />
      <div className="relative w-[180px] h-1.5 bg-white/15 rounded-full">
        <div
          className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-[width] duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-white/90 tabular-nums w-[60px] text-right">{formatted}</span>
      <ArrowHint dir="right" visible={isFocused && value < row.max} />
    </div>
  );
};

const TextControl = ({
  row,
  value,
  isFocused,
  isEditing,
}: {
  row: TextRow;
  value: string;
  isFocused: boolean;
  isEditing: boolean;
}) => (
  <div className="flex flex-col items-end">
    <div className={`flex items-center gap-1 text-sm ${isEditing ? "text-white" : "text-white/90"}`}>
      <span className="max-w-[220px] truncate">{value || <em className="text-white/40">unset</em>}</span>
      {isEditing && <span className="inline-block w-[2px] h-4 bg-white animate-pulse ml-0.5" aria-hidden />}
    </div>
    {isFocused && row.editHint && !isEditing && (
      <span className="text-[9px] tracking-[0.25em] uppercase text-white/35 mt-0.5">{row.editHint}</span>
    )}
  </div>
);

const GamepadControl = ({
  selected,
  options,
  isFocused,
}: {
  selected: number | null;
  options: readonly GamepadOption[];
  isFocused: boolean;
}) => {
  const currentIdx = Math.max(
    0,
    options.findIndex((o) => o.index === selected),
  );
  const currentLabel = options[currentIdx]?.label ?? "—";
  return (
    <div className="flex items-center gap-3">
      <ArrowHint dir="left" visible={isFocused && options.length > 1} />
      <span className="max-w-[260px] truncate text-xs text-white/90">{currentLabel}</span>
      <ArrowHint dir="right" visible={isFocused && options.length > 1} />
    </div>
  );
};

const ArrowHint = ({ dir, visible }: { dir: "left" | "right"; visible: boolean }) => (
  <span
    className={`text-white/70 text-sm transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
    aria-hidden
  >
    {dir === "left" ? "‹" : "›"}
  </span>
);

const KeyHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 mr-2 rounded border border-white/30 text-[10px] font-bold tracking-wider text-white/70 align-middle"
    aria-hidden
  >
    {label}
  </span>
);

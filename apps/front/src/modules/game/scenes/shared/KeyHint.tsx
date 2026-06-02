import { Fragment, type ReactNode } from "react";

/**
 * A single keycap chip (e.g. "A", "↑↓", "B") shown in a menu's input-hint
 * footer. The standalone glyph used across every menu scene.
 */
export const KeyHint = ({ label }: { label: string }) => (
  <span
    className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 mr-2 rounded border border-white/30 text-[10px] font-bold tracking-wider text-white/70 align-middle"
    aria-hidden
  >
    {label}
  </span>
);

export type HintItem = { key: string; label: ReactNode };

/**
 * The `<key> Label | <key> Label | …` run of input hints. Renders only the
 * items + separators (no outer box), so each scene keeps its own wrapper —
 * spacing/size come from the parent's flex `gap` and text classes.
 */
export const HintBar = ({ items }: { items: readonly HintItem[] }) => (
  <>
    {items.map((item, i) => (
      <Fragment key={item.key}>
        {i > 0 && <span className="text-white/20">|</span>}
        <span>
          <KeyHint label={item.key} /> {item.label}
        </span>
      </Fragment>
    ))}
  </>
);

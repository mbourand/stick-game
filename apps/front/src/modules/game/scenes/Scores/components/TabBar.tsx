import { motion } from "motion/react";
import { useStore } from "../../../engine/state/useStore";
import type { ScoresScene, ScoresTab } from "../ScoresScene";

const TABS: { id: ScoresTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "graph", label: "Graph" },
  { id: "rank", label: "Rank" },
];

/**
 * Three-way tab selector under the hero. Reflects `scene.activeTab` (also
 * driven by ◀ ▶ / stick from the scene) and lets the mouse click between tabs.
 */
export const TabBar = ({ scene }: { scene: ScoresScene }) => {
  const active = useStore(scene.activeTab);

  return (
    <div className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 p-1 pointer-events-auto">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => scene.setTab(tab.id)}
            className={`relative px-5 py-1.5 rounded-full text-xs tracking-[0.25em] uppercase transition-colors duration-150 ${
              isActive ? "text-white" : "text-white/45 hover:text-white/70"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="scores-tab-pill"
                className="absolute inset-0 rounded-full bg-white/15 border border-white/30"
                transition={{ type: "spring", stiffness: 500, damping: 36 }}
                aria-hidden
              />
            )}
            <span className="relative">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

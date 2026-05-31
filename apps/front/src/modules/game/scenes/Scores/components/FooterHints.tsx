import { motion } from "motion/react";
import { fade } from "../../../engine/animation/poses";
import { useScenePresenceMotion } from "../../../engine/animation/useScenePresenceMotion";
import type { ScoresTab } from "../ScoresScene";

export const FooterHints = ({ activeTab }: { activeTab: ScoresTab }) => {
  const motionProps = useScenePresenceMotion({ ...fade({ y: 14 }), enterDelay: 0.2 });

  return (
    <motion.div
      className="flex items-center gap-4 text-[11px] text-white/40 tracking-[0.3em] uppercase"
      {...motionProps}
    >
      <Hint keys="◀ ▶">Tabs</Hint>
      {activeTab === "rank" && <Hint keys="L R">Board</Hint>}
      <Hint keys="A">Retry</Hint>
      <Hint keys="B">Select</Hint>
    </motion.div>
  );
};

const Hint = ({ keys, children }: { keys: string; children: string }) => (
  <span className="flex items-center gap-1.5">
    <span
      className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-white/30 text-[10px] font-bold tracking-wider text-white/70"
      aria-hidden
    >
      {keys}
    </span>
    {children}
  </span>
);

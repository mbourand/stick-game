"use client";

import { AnimatePresence, motion } from "motion/react";
import { fade } from "../../engine/animation/poses";
import { useScenePresenceMotion } from "../../engine/animation/useScenePresenceMotion";
import { useStore } from "../../engine/state/useStore";
import { JudgmentKind } from "../../judge/constants";
import { SCORES_CIRCLE_RADIUS } from "../../utils/constants";
import type { SceneUIComponent } from "../Scene";
import { FooterHints } from "./components/FooterHints";
import { GraphTab } from "./components/GraphTab";
import { HeroStats } from "./components/HeroStats";
import { OverviewTab } from "./components/OverviewTab";
import { RankTab } from "./components/RankTab";
import { ResultHeader } from "./components/ResultHeader";
import { TabBar } from "./components/TabBar";
import type { ScoresScene } from "./ScoresScene";

// Column width tuned to sit comfortably inside the scores ring (the canvas is
// 1:1 with CSS px, so SCORES_CIRCLE_RADIUS is the on-screen radius). Bump
// SCORES_CIRCLE_RADIUS if a wider layout is ever needed.
const CONTENT_WIDTH = Math.round(SCORES_CIRCLE_RADIUS * 1.14);
// Fixed (not min) height: every tab occupies the same vertical space, so the
// pinned hero never shifts when switching to a taller tab like the leaderboard.
const TAB_BODY_HEIGHT = 250;
// How far tabs travel as they cross-fade; full circle diameter masks the slide.
const SLIDE = 55;
const CIRCLE_DIAMETER = SCORES_CIRCLE_RADIUS * 2;

export const ScoresView: SceneUIComponent<ScoresScene> = ({ scene }) => {
  const shellMotion = useScenePresenceMotion(fade());
  const activeTab = useStore(scene.activeTab);

  const sc = scene.scoreCounter;
  const score = sc.getScore();
  const accuracy = sc.getAccuracy();
  const missCount = sc.getJudgmentCount(JudgmentKind.Miss);

  // Function variants read the scene's live direction at animation time (rather
  // than baked-in custom), so the *exiting* tab uses the current direction too —
  // pressing right slides out left / in from right, left mirrors it. Tabs also
  // cross-fade, and a circular mask (not a hard rectangle) keeps the slide
  // inside the ring.
  const tabVariants = {
    enter: () => ({ x: scene.tabDirection >= 0 ? `${SLIDE}%` : `-${SLIDE}%`, opacity: 0 }),
    center: { x: "0%", opacity: 1 },
    exit: () => ({ x: scene.tabDirection >= 0 ? `-${SLIDE}%` : `${SLIDE}%`, opacity: 0 }),
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center text-white select-none"
      style={{ fontFamily: "Rostex", textShadow: "0 2px 14px rgba(0,0,0,0.55)" }}
      {...shellMotion}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: CIRCLE_DIAMETER, height: CIRCLE_DIAMETER, borderRadius: "50%", overflow: "hidden" }}
      >
        <div className="flex flex-col items-center" style={{ width: CONTENT_WIDTH }}>
          <ResultHeader parsedMap={scene.parsedMap} />
          <HeroStats score={score} accuracy={accuracy} missCount={missCount} />

          <div className="mt-6">
            <TabBar scene={scene} />
          </div>

          <div className="mt-5 w-full relative" style={{ height: TAB_BODY_HEIGHT }}>
            <AnimatePresence initial={false}>
              <motion.div
                key={activeTab}
                className="absolute inset-0"
                variants={tabVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                {activeTab === "overview" && <OverviewTab scoreCounter={sc} />}
                {activeTab === "graph" && <GraphTab scoreCounter={sc} />}
                {activeTab === "rank" && <RankTab scene={scene} />}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4">
            <FooterHints activeTab={activeTab} />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

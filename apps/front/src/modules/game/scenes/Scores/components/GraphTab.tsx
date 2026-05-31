"use client";

import type { ScoreCounter } from "../../../score/ScoreCounter";
import { GRADE_COLOR, GRADE_THRESHOLDS } from "../grade";

const W = 480;
const H = 170;
const PAD_X = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 22;
// Cap the visible floor so the 80–100% grade band always has room to read,
// even for near-perfect plays; the floor still follows the data when it dips lower.
const MAX_FLOOR = 78;

/**
 * Running cumulative-accuracy line over the course of the play. X is song time
 * (first → last judged note), Y is accuracy from a padded floor up to 100%, so
 * the final point equals the displayed accuracy.
 */
export const GraphTab = ({ scoreCounter }: { scoreCounter: ScoreCounter }) => {
  const samples = scoreCounter.getAccuracyTimeline();

  if (samples.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-white/40 tracking-[0.2em] uppercase">
        No data
      </div>
    );
  }

  const accuracies = samples.map((s) => s.accuracy);
  const maxAcc = 100;
  const lo = Math.max(0, Math.min(Math.floor(Math.min(...accuracies)) - 2, MAX_FLOOR));
  const range = maxAcc - lo || 1;
  const gradeLines = GRADE_THRESHOLDS.filter((t) => t.accuracy >= lo);

  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const baselineY = H - PAD_BOTTOM;

  const t0 = samples[0].time;
  const tEnd = samples[samples.length - 1].time;
  const span = tEnd - t0 || 1;

  const xFor = (time: number) =>
    samples.length === 1 ? PAD_X + innerW / 2 : PAD_X + ((time - t0) / span) * innerW;
  const yFor = (acc: number) => PAD_TOP + (1 - (acc - lo) / range) * innerH;

  const points = samples.map((s) => `${xFor(s.time).toFixed(1)},${yFor(s.accuracy).toFixed(1)}`);
  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `${linePath} L ${xFor(tEnd).toFixed(1)},${baselineY} L ${xFor(t0).toFixed(1)},${baselineY} Z`;
  const last = samples[samples.length - 1];

  return (
    <div className="h-full flex flex-col items-center justify-center gap-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxWidth: W }}
        role="img"
        aria-label="Accuracy over the play"
      >
        <defs>
          <linearGradient id="scores-acc-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
          </linearGradient>
        </defs>

        <line x1={PAD_X} y1={baselineY} x2={W - PAD_X} y2={baselineY} stroke="#ffffff" strokeOpacity={0.15} />

        <path d={areaPath} fill="url(#scores-acc-fill)" />

        {/* Grade boundaries within view, dashed + labeled with the grade you reach there. */}
        {gradeLines.map((t) => {
          const y = yFor(t.accuracy);
          const color = GRADE_COLOR[t.grade];
          return (
            <g key={t.grade}>
              <line
                x1={PAD_X}
                y1={y}
                x2={W - PAD_X}
                y2={y}
                stroke={color}
                strokeOpacity={0.35}
                strokeWidth={1}
                strokeDasharray="3 5"
              />
              <text x={PAD_X + 2} y={y - 3} fill={color} fillOpacity={0.85} fontSize={10}>
                {t.grade}
              </text>
            </g>
          );
        })}

        <path d={linePath} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xFor(last.time)} cy={yFor(last.accuracy)} r={3.5} fill="#ffffff" />

        <text x={W - PAD_X} y={baselineY + 15} fill="#ffffff" fillOpacity={0.4} fontSize={11} textAnchor="end">
          floor {lo}%
        </text>
      </svg>
      <div className="text-[11px] text-white/40 tracking-[0.25em] uppercase">Accuracy over the play</div>
    </div>
  );
};

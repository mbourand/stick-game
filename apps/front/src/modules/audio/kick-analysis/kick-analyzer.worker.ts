// Web Worker entry: runs the heavy HPSS kick analysis off the main thread so
// the load-time analysis never janks the UI. See ./analyze.ts for the DSP.

import { analyzeKicks, type KickEvent } from "./analyze";

export type KickAnalyzerRequest = { channels: Float32Array[]; sampleRate: number };
export type KickAnalyzerResponse = { ok: true; events: KickEvent[] } | { ok: false; error: string };

self.onmessage = (e: MessageEvent<KickAnalyzerRequest>) => {
  try {
    const { channels, sampleRate } = e.data;
    const events = analyzeKicks(channels, sampleRate);
    (self as unknown as Worker).postMessage({ ok: true, events } satisfies KickAnalyzerResponse);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    (self as unknown as Worker).postMessage({ ok: false, error } satisfies KickAnalyzerResponse);
  }
};

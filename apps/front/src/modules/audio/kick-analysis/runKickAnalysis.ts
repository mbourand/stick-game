import { analyzeKicks, type KickEvent } from "./analyze";
import type { KickAnalyzerRequest, KickAnalyzerResponse } from "./kick-analyzer.worker";

// Per-session cache keyed by audio URL so retrying the same map (which builds a
// fresh scene) doesn't re-run the analysis. Timelines are small.
const cache = new Map<string, KickEvent[]>();

/**
 * Analyze a decoded song into a kick timeline. Runs the DSP in a Web Worker so
 * the ~1-2s analysis doesn't block the main thread during loading; falls back
 * to a synchronous main-thread run if the worker can't be created (older
 * bundler/runtime, SSR, etc.).
 *
 * The AudioBuffer's channel data is COPIED before being handed to the worker —
 * transferring the live backing store would detach it and corrupt playback.
 *
 * Pass `cacheKey` (the audio URL) to memoize across scene rebuilds (retry).
 */
export async function runKickAnalysis(buffer: AudioBuffer, cacheKey?: string): Promise<KickEvent[]> {
  if (cacheKey) {
    const hit = cache.get(cacheKey);
    if (hit) return hit;
  }

  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(new Float32Array(buffer.getChannelData(c)));
  }
  const sampleRate = buffer.sampleRate;

  let events: KickEvent[];
  try {
    events = await analyzeInWorker(channels, sampleRate);
  } catch {
    // Fallback: run on the main thread. Still correct, just briefly blocking.
    // `channels` are intact here because we do NOT transfer them to the worker.
    events = analyzeKicks(channels, sampleRate);
  }

  if (cacheKey) cache.set(cacheKey, events);
  return events;
}

function analyzeInWorker(channels: Float32Array[], sampleRate: number): Promise<KickEvent[]> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === "undefined") {
      reject(new Error("Worker unavailable"));
      return;
    }
    const worker = new Worker(new URL("./kick-analyzer.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<KickAnalyzerResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.events);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Worker error"));
    };
    const req: KickAnalyzerRequest = { channels, sampleRate };
    // NOTE: do NOT transfer the channel buffers — structured-clone copies them
    // instead. Transferring would detach `channels` and break the main-thread
    // fallback if the worker errors after this point.
    worker.postMessage(req);
  });
}

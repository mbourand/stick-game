import { analyzeKicks, type KickEvent } from "./analyze";
import type { KickAnalyzerRequest, KickAnalyzerResponse } from "./kick-analyzer.worker";

// Per-session cache keyed by audio URL so retrying the same map (which builds a
// fresh scene) doesn't re-run the analysis. Timelines are small.
const cache = new Map<string, KickEvent[]>();

/**
 * Analyze a decoded song into a kick timeline. Runs the DSP in a Web Worker so
 * the ~1-2s analysis doesn't block the main thread during loading; falls back
 * to a synchronous main-thread run only when no Worker exists (older
 * bundler/runtime, SSR, etc.).
 *
 * We make ONE copy of each channel (the live AudioBuffer backing store can't be
 * detached without corrupting playback), then TRANSFER that copy to the worker
 * — zero-copy, so the whole waveform (~80MB for a long stereo song) isn't
 * structured-clone-serialized on the main thread, which was a multi-hundred-ms
 * stall mid-load. Once transferred the copy is detached on our side, but we
 * never reuse it: a worker that errors mid-run yields an empty timeline, which
 * the caller already treats as non-fatal (the visualizer falls back to live
 * FFT). The synchronous main-thread DSP path is reserved for the no-Worker
 * case, decided up front before any transfer.
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
  if (typeof Worker === "undefined") {
    // No worker available — run on the main thread (briefly blocking, but
    // correct). `channels` are intact since nothing transferred them.
    events = analyzeKicks(channels, sampleRate);
  } else {
    try {
      events = await analyzeInWorker(channels, sampleRate);
    } catch {
      // Worker existed but failed mid-run; `channels` are now detached, so the
      // main-thread fallback can't reuse them. Kick analysis is non-fatal —
      // an empty timeline just leaves the visualizer on its live-FFT path.
      events = [];
    }
  }

  if (cacheKey) cache.set(cacheKey, events);
  return events;
}

function analyzeInWorker(channels: Float32Array[], sampleRate: number): Promise<KickEvent[]> {
  return new Promise((resolve, reject) => {
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
    // Transfer the channel buffers (zero-copy) rather than letting postMessage
    // structured-clone them — copying ~80MB synchronously here was the stall.
    // Safe because we own these copies and never read them again on this side.
    worker.postMessage(
      req,
      channels.map((channel) => channel.buffer),
    );
  });
}

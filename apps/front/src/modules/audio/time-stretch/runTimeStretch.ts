import { timeStretchChannels } from "./timeStretch";
import type { TimeStretchRequest, TimeStretchResponse } from "./time-stretch.worker";

// Per-session cache keyed by url + tempo so retrying the same map at the same rate
// doesn't re-run the stretch. Cleared implicitly when the tab closes.
const cache = new Map<string, AudioBuffer>();

/**
 * Return a pitch-preserved, tempo-scaled copy of `buffer` (tempo > 1 = faster).
 * Runs the WSOLA time-stretch in a Web Worker so the ~hundreds-of-ms processing
 * doesn't block the load transition; falls back to a synchronous main-thread run
 * when no Worker exists. We copy each channel before transferring (the live
 * AudioBuffer backing store can't be detached without corrupting playback), then
 * rebuild an AudioBuffer from the worker's output on this side.
 *
 * Pass `cacheKey` (the audio URL) to memoize across scene rebuilds (retry).
 */
export async function runTimeStretch(
  audioContext: BaseAudioContext,
  buffer: AudioBuffer,
  tempo: number,
  cacheKey?: string,
): Promise<AudioBuffer> {
  const key = cacheKey ? `${cacheKey}@${tempo}` : undefined;
  if (key) {
    const hit = cache.get(key);
    if (hit) return hit;
  }

  const channels: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    channels.push(new Float32Array(buffer.getChannelData(c)));
  }

  const stretched =
    typeof Worker === "undefined"
      ? timeStretchChannels(channels, tempo)
      : await stretchInWorker(channels, tempo);

  const result = audioContext.createBuffer(stretched.length, stretched[0].length, buffer.sampleRate);
  for (let c = 0; c < stretched.length; c++) {
    result.getChannelData(c).set(stretched[c]);
  }

  if (key) cache.set(key, result);
  return result;
}

function stretchInWorker(channels: Float32Array[], tempo: number): Promise<Float32Array[]> {
  return new Promise((resolve, reject) => {
    // Module worker (not classic): the worker imports the external soundtouchjs
    // ESM package, which a classic worker can't `import`.
    const worker = new Worker(new URL("./time-stretch.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent<TimeStretchResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.channels);
      else reject(new Error(e.data.error));
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message || "Worker error"));
    };
    const req: TimeStretchRequest = { channels, tempo };
    // Transfer the channel buffers (zero-copy) rather than structured-cloning the
    // whole waveform synchronously on the main thread.
    worker.postMessage(
      req,
      channels.map((channel) => channel.buffer),
    );
  });
}

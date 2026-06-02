// Web Worker entry: runs the pitch-preserving time-stretch off the main thread so
// the load-time processing never janks the UI. See ./timeStretch.ts for the DSP.

import { timeStretchChannels } from "./timeStretch";

export type TimeStretchRequest = { channels: Float32Array[]; tempo: number };
export type TimeStretchResponse = { ok: true; channels: Float32Array[] } | { ok: false; error: string };

self.onmessage = (e: MessageEvent<TimeStretchRequest>) => {
  try {
    const { channels, tempo } = e.data;
    const stretched = timeStretchChannels(channels, tempo);
    (self as unknown as Worker).postMessage(
      { ok: true, channels: stretched } satisfies TimeStretchResponse,
      // Transfer the output buffers back (zero-copy); we don't read them again here.
      stretched.map((channel) => channel.buffer),
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    (self as unknown as Worker).postMessage({ ok: false, error } satisfies TimeStretchResponse);
  }
};

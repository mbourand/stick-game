// Pitch-preserving time-stretch of decoded PCM, used by the rate mod so a sped-up
// (or slowed-down) song keeps its original pitch. SoundTouch is a WSOLA-based
// tempo changer: `tempo = rate` makes the audio play `rate`× faster while leaving
// pitch untouched. Pure (no DOM/AudioContext) so it can run in a Web Worker — the
// caller wraps the returned channels back into an AudioBuffer.

import { SimpleFilter, SoundTouch } from "soundtouchjs";

const FRAME_BUFFER = 4096;

/**
 * Feeds plain channel arrays to SoundTouch's stereo-interleaved pipeline. Mirrors
 * the library's WebAudioBufferSource but reads from Float32Arrays (a worker has no
 * AudioBuffer). Mono is fed to both interleaved slots so SoundTouch's always-stereo
 * core works; the extra channel is dropped on the way out.
 */
class ChannelSource {
  constructor(
    private readonly channels: Float32Array[],
    private readonly length: number,
  ) {}

  extract(target: Float32Array, numFrames: number, position: number): number {
    const left = this.channels[0];
    const right = this.channels.length > 1 ? this.channels[1] : this.channels[0];
    const available = Math.min(numFrames, this.length - position);
    for (let i = 0; i < available; i++) {
      target[i * 2] = left[position + i];
      target[i * 2 + 1] = right[position + i];
    }
    return available;
  }
}

/**
 * Time-stretch `channels` by `tempo` (>1 = faster), preserving pitch. Returns new
 * channel arrays of length ≈ `originalLength / tempo`, with the same channel count.
 */
export function timeStretchChannels(channels: Float32Array[], tempo: number): Float32Array[] {
  const numberOfChannels = channels.length;
  const length = channels[0].length;

  const soundTouch = new SoundTouch();
  soundTouch.tempo = tempo;
  const filter = new SimpleFilter(new ChannelSource(channels, length), soundTouch);

  const interleaved = new Float32Array(FRAME_BUFFER * 2);
  // Preallocate to the expected output size (+ one frame of slack for the
  // algorithm's tail), growing only in the rare case the estimate is short.
  let capacity = Math.ceil(length / tempo) + FRAME_BUFFER;
  let left = new Float32Array(capacity);
  let right = numberOfChannels > 1 ? new Float32Array(capacity) : null;
  let written = 0;

  let extracted: number;
  while ((extracted = filter.extract(interleaved, FRAME_BUFFER)) > 0) {
    if (written + extracted > capacity) {
      capacity = (written + extracted) * 2;
      const grown = new Float32Array(capacity);
      grown.set(left.subarray(0, written));
      left = grown;
      if (right) {
        const grownRight = new Float32Array(capacity);
        grownRight.set(right.subarray(0, written));
        right = grownRight;
      }
    }
    for (let i = 0; i < extracted; i++) {
      left[written + i] = interleaved[i * 2];
      if (right) right[written + i] = interleaved[i * 2 + 1];
    }
    written += extracted;
  }

  // slice() to exact length yields standalone buffers (transferable from a worker).
  const out = [left.slice(0, written)];
  if (right) out.push(right.slice(0, written));
  return out;
}

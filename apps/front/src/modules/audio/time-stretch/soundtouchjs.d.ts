// Minimal ambient types for soundtouchjs (ships untyped) — only the surface the
// time-stretch module uses.
declare module "soundtouchjs" {
  /** WSOLA tempo/pitch/rate processor. Setting `tempo` changes speed, preserving pitch. */
  export class SoundTouch {
    tempo: number;
    pitch: number;
    rate: number;
  }

  /** A sample source feeding SimpleFilter: fills `target` with interleaved stereo frames. */
  export interface SoundTouchSource {
    extract(target: Float32Array, numFrames: number, position: number): number;
  }

  /** Pulls from a source through a SoundTouch pipe; `extract` drains processed frames. */
  export class SimpleFilter {
    constructor(sourceSound: SoundTouchSource, pipe: SoundTouch, callback?: () => void);
    extract(target: Float32Array, numFrames?: number): number;
  }
}

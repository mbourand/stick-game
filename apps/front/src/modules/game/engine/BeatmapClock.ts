import type { Clock } from "./Clock";

type State = "idle" | "scheduled" | "stopped";

export class BeatmapClock implements Clock {
  private audioContext: AudioContext;
  private playbackAnchorSec: number = 0;
  private frozenValueMs: number = 0;
  private state: State = "idle";

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext;
  }

  public schedule(initialOffsetMs: number): number {
    const preRollSeconds = Math.max(0, -initialOffsetMs) / 1000;
    this.playbackAnchorSec = this.audioContext.currentTime + preRollSeconds;
    this.state = "scheduled";
    return this.playbackAnchorSec;
  }

  public stop() {
    if (this.state !== "scheduled") return;
    this.frozenValueMs = this.now();
    this.state = "stopped";
  }

  public now(): number {
    if (this.state === "idle") return 0;
    if (this.state === "stopped") return this.frozenValueMs;
    return (this.audioContext.currentTime - this.playbackAnchorSec) * 1000;
  }
}

export type PlayOptions = {
  volume?: number;
  loop?: boolean;
  startAt?: number;
  startOffset?: number;
};

type PlayingEntry = { source: AudioBufferSourceNode; gainNode: GainNode };

export class AudioBus {
  private readonly audioContext: AudioContext;
  private readonly masterGain: GainNode;
  private playing = new Map<string, PlayingEntry>();

  constructor() {
    this.audioContext = new AudioContext();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
  }

  public getAudioContext(): AudioContext {
    return this.audioContext;
  }

  public async loadBuffer(url: string): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await this.audioContext.decodeAudioData(arrayBuffer);
  }

  public play(id: string, buffer: AudioBuffer, opts: PlayOptions = {}): AudioBufferSourceNode {
    this.stop(id);

    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();

    source.buffer = buffer;
    source.loop = opts.loop ?? false;
    gainNode.gain.value = opts.volume ?? 1;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(opts.startAt ?? 0, opts.startOffset ?? 0);

    this.playing.set(id, { source, gainNode });
    return source;
  }

  public stop(id: string) {
    const entry = this.playing.get(id);
    if (!entry) return;
    try {
      entry.source.stop();
    } catch {
      // Already stopped or never started
    }
    this.playing.delete(id);
  }

  public setVolume(id: string, volume: number) {
    this.playing.get(id)?.gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
  }

  public setMasterVolume(volume: number) {
    this.masterGain.gain.setValueAtTime(volume, this.audioContext.currentTime);
  }

  public suspend(): Promise<void> {
    return this.audioContext.suspend();
  }

  public resume(): Promise<void> {
    return this.audioContext.resume();
  }

  public destroy() {
    for (const id of [...this.playing.keys()]) this.stop(id);
    void this.audioContext.close();
  }
}

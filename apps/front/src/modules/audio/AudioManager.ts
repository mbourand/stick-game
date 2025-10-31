import { Settings } from "../settings/Settings";

export class AudioManager {
  public soundEffectContext: AudioContext;
  public musicContext: AudioContext;
  private playingSources = new Map<string, { source: AudioBufferSourceNode; gainNode: GainNode }>();

  private static instance: AudioManager;

  private soundBuffers: Record<"hit" | "miss", { sound: Promise<AudioBuffer>; volume: number; context: AudioContext }>;

  public static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }

    return AudioManager.instance;
  }

  constructor() {
    this.soundEffectContext = new AudioContext();
    this.musicContext = new AudioContext();

    this.soundBuffers = {
      hit: {
        sound: AudioManager.loadSound("/hit.wav", this.soundEffectContext),
        volume: 0.66,
        context: this.soundEffectContext,
      },
      miss: {
        sound: AudioManager.loadSound("/miss.ogg", this.soundEffectContext),
        volume: 1,
        context: this.soundEffectContext,
      },
    } as const;
  }

  public static async playSound(buffer: "hit" | "miss") {
    if (this.getInstance().playingSources.has(buffer)) {
      this.stopSoundById(buffer);
    }

    const { context, volume, sound } = this.getInstance().soundBuffers[buffer];
    const audioBuffer = await sound;

    const source = context.createBufferSource();
    const gainNode = context.createGain();
    gainNode.gain.value = volume * Settings.getSettings().volume;

    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(0);

    this.getInstance().playingSources.set(buffer, { source, gainNode });
  }

  public static playMusic(id: string, buffer: AudioBuffer, volume: number) {
    if (this.getInstance().playingSources.has(id)) {
      AudioManager.stopSoundById(id);
    }

    const context = this.getInstance().musicContext;
    const source = context.createBufferSource();
    const gainNode = context.createGain();

    gainNode.gain.value = volume;
    source.buffer = buffer;

    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(0);

    this.getInstance().playingSources.set(id, { source, gainNode });
    return source;
  }

  public static async loadSound(url: string, context: AudioContext): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
  }

  public static stopSoundById(id: string) {
    const entry = this.getInstance().playingSources.get(id);
    if (entry) {
      entry.source.stop();
      this.getInstance().playingSources.delete(id);
    }
  }

  public static setVolumeById(id: string, volume: number) {
    const entry = this.getInstance().playingSources.get(id);
    if (entry) entry.gainNode.gain.value = volume;
  }
}

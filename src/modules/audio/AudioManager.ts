import { Settings } from "../settings/Settings";

export class AudioManager {
  public static soundEffectContext = new AudioContext();
  public static musicContext = new AudioContext();

  public static SOUND_BUFFERS = {
    hit: {
      sound: AudioManager.loadSound("/hit.wav", AudioManager.soundEffectContext),
      volume: 0.66,
      context: AudioManager.soundEffectContext,
    },
    miss: {
      sound: AudioManager.loadSound("/miss.ogg", AudioManager.soundEffectContext),
      volume: 1,
      context: AudioManager.soundEffectContext,
    },
  } as const;

  public static playingSources = new Map<string, { source: AudioBufferSourceNode; gainNode: GainNode }>();

  public static async playSound(buffer: keyof typeof AudioManager.SOUND_BUFFERS) {
    if (AudioManager.playingSources.has(buffer)) {
      AudioManager.stopSoundById(buffer);
    }

    const { context, volume, sound } = AudioManager.SOUND_BUFFERS[buffer];
    const audioBuffer = await sound;

    const source = context.createBufferSource();
    const gainNode = context.createGain();
    gainNode.gain.value = volume * Settings.getSettings().volume;

    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(0);

    AudioManager.playingSources.set(buffer, { source, gainNode });
  }

  public static playMusic(id: string, buffer: AudioBuffer, volume: number) {
    if (AudioManager.playingSources.has(id)) {
      AudioManager.stopSoundById(id);
    }

    const context = AudioManager.musicContext;
    const source = context.createBufferSource();
    const gainNode = context.createGain();

    gainNode.gain.value = volume;
    source.buffer = buffer;

    source.connect(gainNode);
    gainNode.connect(context.destination);
    source.start(0);

    AudioManager.playingSources.set(id, { source, gainNode });
    return source;
  }

  public static async loadSound(url: string, context: AudioContext): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
  }

  public static stopSoundById(id: string) {
    const entry = AudioManager.playingSources.get(id);
    if (entry) {
      entry.source.stop();
      AudioManager.playingSources.delete(id);
    }
  }

  public static setVolumeById(id: string, volume: number) {
    const entry = AudioManager.playingSources.get(id);
    if (entry) entry.gainNode.gain.value = volume;
  }
}

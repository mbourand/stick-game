export class AudioManager {
  public static soundEffectContext = new AudioContext();
  public static musicContext = new AudioContext();

  public static SOUND_BUFFERS = {
    hit: {
      sound: AudioManager.loadSound("/hit.wav", AudioManager.soundEffectContext),
      volume: 0.1,
      context: AudioManager.soundEffectContext,
    },
    miss: {
      sound: AudioManager.loadSound("/miss.ogg", AudioManager.soundEffectContext),
      volume: 0.3,
      context: AudioManager.soundEffectContext,
    },
  } as const satisfies Record<string, { sound: Promise<AudioBuffer>; volume: number; context: AudioContext }>;

  public static playingSources = new Map<string, AudioBufferSourceNode>();

  public static async playSound(buffer: keyof typeof AudioManager.SOUND_BUFFERS) {
    if (AudioManager.playingSources.has(buffer)) {
      AudioManager.stopSoundById(buffer);
    }

    const source = AudioManager.SOUND_BUFFERS[buffer].context.createBufferSource();
    const gainNode = AudioManager.SOUND_BUFFERS[buffer].context.createGain();
    gainNode.gain.value = AudioManager.SOUND_BUFFERS[buffer].volume;

    const audioBuffer = await AudioManager.SOUND_BUFFERS[buffer].sound;
    source.buffer = audioBuffer;
    source.connect(gainNode);
    gainNode.connect(AudioManager.SOUND_BUFFERS[buffer].context.destination);
    source.start(0);

    AudioManager.playingSources.set(buffer, source);

    return source;
  }

  public static playMusic(id: string, buffer: AudioBuffer, volume: number) {
    if (AudioManager.playingSources.has(id)) {
      AudioManager.stopSoundById(id);
    }

    const source = AudioManager.musicContext.createBufferSource();
    const gainNode = AudioManager.musicContext.createGain();
    gainNode.gain.value = volume;

    source.buffer = buffer;
    source.connect(gainNode);
    gainNode.connect(AudioManager.musicContext.destination);
    source.start(0);

    AudioManager.playingSources.set(id, source);

    return source;
  }

  public static async loadSound(url: string, context: AudioContext): Promise<AudioBuffer> {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return await context.decodeAudioData(arrayBuffer);
  }

  public static stopSoundById(id: string) {
    const source = AudioManager.playingSources.get(id);
    if (source) {
      source.stop();
      AudioManager.playingSources.delete(id);
    }
  }
}

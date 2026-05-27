import { AudioBus } from "./AudioBus";

type RegisteredSfx = { buffer: AudioBuffer; mixVolume: number };

export class Audio {
  public readonly music = new AudioBus();
  public readonly sfx = new AudioBus();

  private sfxLibrary = new Map<string, RegisteredSfx>();

  public async registerSfx(id: string, url: string, mixVolume = 1) {
    const buffer = await this.sfx.loadBuffer(url);
    this.sfxLibrary.set(id, { buffer, mixVolume });
  }

  public playSfx(id: string) {
    const sfx = this.sfxLibrary.get(id);
    if (!sfx) return;
    this.sfx.play(id, sfx.buffer, { volume: sfx.mixVolume });
  }

  public setMasterVolume(volume: number) {
    this.music.setMasterVolume(volume);
    this.sfx.setMasterVolume(volume);
  }

  public destroy() {
    this.music.destroy();
    this.sfx.destroy();
  }
}

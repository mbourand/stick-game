export class Clock {
  private elapsedTime: number;
  private frequency: number;
  private lastTime: number | undefined;

  constructor(frequency: number) {
    this.elapsedTime = 0;
    this.frequency = frequency;
  }

  public update(currentTime: number) {
    if (this.lastTime === undefined) {
      this.lastTime = currentTime;
      return;
    }

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    this.elapsedTime += deltaTime;

    if (this.elapsedTime >= this.frequency) {
      this.elapsedTime -= this.frequency;
      return true;
    }

    return false;
  }

  public reset() {
    this.lastTime = undefined;
    this.elapsedTime = 0;
  }

  public getElapsedTime() {
    return this.elapsedTime;
  }

  public getFrequency() {
    return this.frequency;
  }

  public setFrequency(frequency: number) {
    this.frequency = frequency;
  }
}

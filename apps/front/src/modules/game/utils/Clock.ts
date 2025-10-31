export class Clock {
  private elapsedTime: number;
  private frequency: number;

  constructor(frequency: number) {
    this.elapsedTime = 0;
    this.frequency = frequency;
  }

  public update(deltaTime: number) {
    this.elapsedTime += deltaTime;

    if (this.elapsedTime >= this.frequency) {
      this.elapsedTime -= this.frequency;
      return true;
    }

    return false;
  }

  public reset() {
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

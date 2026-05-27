export interface Clock {
  now(): number;
}

export class RealtimeClock implements Clock {
  private elapsed = 0;

  public advance(dt: number) {
    this.elapsed += dt;
  }

  public reset() {
    this.elapsed = 0;
  }

  public now(): number {
    return this.elapsed;
  }
}

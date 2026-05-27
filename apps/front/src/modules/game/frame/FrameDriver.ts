export type FrameCallback = (deltaTime: number, time: number) => void;

export class FrameDriver {
  private callbacks = new Set<FrameCallback>();

  public register = (callback: FrameCallback) => {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  };

  public tick(deltaTime: number, time: number) {
    for (const callback of this.callbacks) callback(deltaTime, time);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyEventMap = Record<string, (e: any) => void>;

export class EventEmitter<T extends AnyEventMap> {
  private handlers: { [K in keyof T]?: T[K][] } = {};

  public on<K extends keyof T>(eventType: K, handler: T[K]): () => void {
    if (!this.handlers[eventType]) this.handlers[eventType] = [];
    this.handlers[eventType]!.push(handler);
    return () => this.off(eventType, handler);
  }

  public emit<K extends keyof T>(eventType: K, event: Parameters<T[K]>[0]): void {
    const handlers = this.handlers[eventType];
    if (!handlers) return;
    for (const handler of [...handlers]) handler(event);
  }

  public off<K extends keyof T>(eventType: K, handler: T[K]): void {
    const handlers = this.handlers[eventType];
    if (!handlers) return;
    this.handlers[eventType] = handlers.filter((h) => h !== handler) as T[K][];
  }
}

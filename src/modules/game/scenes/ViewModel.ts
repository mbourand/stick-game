import type { ReactNode } from "react";

export abstract class ViewModel {
  public abstract getView(): ReactNode;
}

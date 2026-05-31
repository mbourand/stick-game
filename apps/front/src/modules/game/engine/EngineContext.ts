import { createContext } from "react";
import type { Engine } from "./Engine";

export const EngineContext = createContext<Engine | null>(null);

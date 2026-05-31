import { useContext } from "react";
import { EngineContext } from "./EngineContext";

export function useEngine() {
  return useContext(EngineContext);
}

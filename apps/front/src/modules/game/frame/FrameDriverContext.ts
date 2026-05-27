"use client";

import { createContext } from "react";
import type { FrameDriver } from "./FrameDriver";

export const FrameDriverContext = createContext<FrameDriver | null>(null);

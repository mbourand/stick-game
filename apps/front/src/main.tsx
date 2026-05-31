import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/global.css";
import { QueryProvider } from "@/components/QueryProvider";
import { GameShell } from "@/modules/game/components/GameShell";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Root element "#root" not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryProvider>
      <div className="w-screen h-screen overflow-hidden">
        <GameShell />
      </div>
    </QueryProvider>
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./app/global.css";
import { QueryProvider } from "@/components/QueryProvider";
import { GameShell } from "@/modules/game/components/GameShell";
import { consumeRedirectToken, refreshAccount } from "@/modules/auth/authActions";

// Pick up a same-tab OAuth redirect token, then revalidate any stored session.
void consumeRedirectToken().then(refreshAccount);

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

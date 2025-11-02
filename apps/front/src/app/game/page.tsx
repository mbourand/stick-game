"use client";

import dynamic from "next/dynamic";

const ClientSideGame = dynamic(() => import("./ClientSideGame").then((mod) => mod.ClientSideGame), { ssr: false });

export default function Page() {
  return (
    <div className="w-screen h-screen overflow-hidden">
      <ClientSideGame />
    </div>
  );
}

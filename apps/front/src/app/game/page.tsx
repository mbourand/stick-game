"use client";

import dynamic from "next/dynamic";

const ClientSideGame = dynamic(() => import("./ClientSideGame").then((mod) => mod.ClientSideGame), { ssr: false });

export default function Page() {
  return <ClientSideGame />;
}

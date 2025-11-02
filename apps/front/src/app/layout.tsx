import "./global.css";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata = {
  title: "Welcome to Tau",
  description: "",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}

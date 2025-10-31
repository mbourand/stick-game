export const metadata = {
  title: "Game page",
  description: "Play online!",
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

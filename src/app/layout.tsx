import { SessionProvider } from "next-auth/react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vocab - Smart Word Learning",
  description: "Look up, save, and review English words daily",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/use-auth";
import "@/app/globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Forex AI Radar",
  description: "AI-powered forex analytics and signal dashboard.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

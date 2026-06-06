import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { AppShell } from "@/components/layout/app-shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-jb", display: "swap" });

export const metadata: Metadata = {
  title: "F1 Oracle AI — Formula 1 Intelligence Platform",
  description:
    "Premium Formula 1 machine-learning platform: race predictions, Monte Carlo simulation, driver & constructor analytics, and circuit intelligence.",
  keywords: ["Formula 1", "F1", "machine learning", "predictions", "Monte Carlo", "analytics"],
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <QueryProvider>
          <AppShell>{children}</AppShell>
          <Toaster
            theme="dark"
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1c1c21",
                border: "1px solid #ffffff24",
                color: "#fafafa",
              },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  );
}

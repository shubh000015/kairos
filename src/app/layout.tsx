import type { Metadata, Viewport } from "next";
import { Fraunces, Geist_Mono, Outfit } from "next/font/google";
import { ThemeApplier } from "@/components/theme/ThemeApplier";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { Toaster } from "@/components/ui/Toast";
import { StoreHydrator } from "@/store/StoreHydrator";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], style: ["normal", "italic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Kairos — a study space built for ADHD brains", template: "%s · Kairos" },
  description:
    "Visual timers, a distraction parking lot, tiny-step task breakdowns, lecture and PDF study modes, a companion that never guilt-trips you. Free, private, shame-free.",
  applicationName: "Kairos",
  keywords: ["ADHD", "study app", "focus timer", "body doubling", "time blindness", "executive function", "pomodoro alternative", "Kairos"],
  openGraph: {
    title: "Kairos",
    description: "A calm study and productivity space designed around how ADHD brains actually work.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#2c363f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <StoreHydrator />
        <ThemeApplier />
        <Toaster />
        {children}
      </body>
    </html>
  );
}

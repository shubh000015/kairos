import type { Metadata } from "next";
import { AppNav } from "@/components/app-shell/AppNav";
import { AppRuntime } from "@/components/app-shell/AppRuntime";
import { VisitedMarker } from "@/components/app-shell/VisitedMarker";
import { DistractionParkingLot } from "@/components/parking-lot/DistractionParkingLot";

export const metadata: Metadata = { title: "App" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full">
      <AppNav />
      <VisitedMarker />
      <AppRuntime />
      <div className="min-w-0 flex-1">
        <main className="mx-auto w-full max-w-5xl px-5 pb-44 pt-16 md:px-10 md:pb-28 md:pt-12">{children}</main>
      </div>
      {/* Available on every app screen, visible only during a focus block. */}
      <DistractionParkingLot />
    </div>
  );
}

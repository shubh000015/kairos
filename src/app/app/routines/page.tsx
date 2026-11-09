import type { Metadata } from "next";
import { DailyAnchors } from "@/components/routines/DailyAnchors";
import { DopamineMenu } from "@/components/routines/DopamineMenu";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Routines" };

export default function RoutinesPage() {
  return (
    <>
      <PageHeader title="Routines" description="Anchors for the day and a menu for breaks. Both reset. Neither keeps score." />
      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <DailyAnchors />
        <DopamineMenu />
      </div>
    </>
  );
}

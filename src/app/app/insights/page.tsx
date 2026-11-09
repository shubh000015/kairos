import type { Metadata } from "next";
import { Insights } from "@/components/insights/Insights";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Insights" };

export default function InsightsPage() {
  return (
    <>
      <PageHeader title="Insights" description="Only numbers that go up. No streaks, no missed days, nothing in red." />
      <Insights />
    </>
  );
}

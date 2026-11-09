import type { Metadata } from "next";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Make it yours. Your data stays in this browser." />
      <SettingsPanel />
    </>
  );
}

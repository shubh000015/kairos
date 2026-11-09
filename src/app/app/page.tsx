import type { Metadata } from "next";
import { FocusDashboard } from "@/components/FocusDashboard";

export const metadata: Metadata = { title: "Focus" };

export default function FocusPage() {
  return <FocusDashboard />;
}

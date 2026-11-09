import type { Metadata } from "next";
import { TaskList } from "@/components/tasks/TaskList";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Tasks" };

export default function TasksPage() {
  return (
    <>
      <PageHeader title="Tasks" description="Capture fast. Break big things into tiny steps. See only the next one." />
      <TaskList />
    </>
  );
}

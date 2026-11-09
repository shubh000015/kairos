"use client";

import { Sunrise } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectOpenTasks, useTaskStore } from "@/store/useTaskStore";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

/**
 * Weekly reset. Archives everything open — nothing is deleted, nothing is counted
 * against you. The copy is deliberately free of "overdue", "missed", or "failed".
 */
export function FreshStart() {
  const open = useTaskStore(useShallow(selectOpenTasks));
  const freshStart = useTaskStore((s) => s.freshStart);
  const [confirming, setConfirming] = useState(false);

  const run = () => {
    const n = freshStart();
    setConfirming(false);
    toast(n > 0 ? `Fresh start. ${n} task${n === 1 ? "" : "s"} tucked away in the archive.` : "Fresh start. Clean slate.");
  };

  if (!confirming) {
    return (
      <Button variant="soft" size="sm" onClick={() => setConfirming(true)}>
        <Sunrise className="size-4" /> Fresh Start
      </Button>
    );
  }

  return (
    <div className="rise-in flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm shadow-soft">
      <span className="text-ink-muted">
        Clear the slate? {open.length > 0 ? `${open.length} open task${open.length === 1 ? "" : "s"} move to the archive — you can bring any back.` : "The list is already clear."}
      </span>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Not now
      </Button>
      <Button variant="primary" size="sm" onClick={run}>
        Yes, fresh start
      </Button>
    </div>
  );
}

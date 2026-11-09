"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { makeId } from "@/lib/id";

interface Toast {
  id: string;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  show: (message: string) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (message) => set((s) => ({ toasts: [...s.toasts.slice(-2), { id: makeId(), message }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (message: string) => useToastStore.getState().show(message);

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  useEffect(() => {
    const id = window.setTimeout(() => dismiss(toast.id), 2800);
    return () => window.clearTimeout(id);
  }, [toast.id, dismiss]);
  return (
    <div className="rise-in pointer-events-auto rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm text-ink shadow-soft">
      {toast.message}
    </div>
  );
}

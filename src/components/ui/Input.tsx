import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const field =
  "w-full rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-base text-ink placeholder:text-ink-faint focus:border-ring focus:outline-none";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${field} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${field} min-h-[6rem] resize-y leading-relaxed ${className}`} {...rest} />;
}

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
      {hint ? <span className="ml-2 font-normal text-ink-faint">{hint}</span> : null}
    </label>
  );
}

import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-border/80 bg-surface-raised shadow-soft ${className}`}
      {...rest}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-sage-700">{icon}</div> : null}
        <div className="min-w-0">
          <h2 className="text-base font-medium text-ink">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-ink-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 py-5 ${className}`} {...rest} />;
}

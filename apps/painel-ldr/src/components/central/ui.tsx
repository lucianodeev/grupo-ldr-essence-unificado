import type { ReactNode } from "react";

import type { Tone } from "@/lib/central";

const TONE_STYLE: Record<Tone, { background: string; color: string; border: string }> = {
  neutral: {
    background: "color-mix(in oklch, var(--muted) 70%, var(--paper))",
    color: "var(--muted-foreground)",
    border: "1px solid var(--border)",
  },
  info: {
    background: "color-mix(in oklch, var(--wine) 12%, var(--paper))",
    color: "var(--wine)",
    border: "1px solid color-mix(in oklch, var(--wine) 30%, transparent)",
  },
  gold: {
    background: "var(--gold-soft)",
    color: "var(--accent-foreground)",
    border: "1px solid color-mix(in oklch, var(--gold) 55%, transparent)",
  },
  success: {
    background: "color-mix(in oklch, var(--success) 16%, var(--paper))",
    color: "var(--success)",
    border: "1px solid color-mix(in oklch, var(--success) 35%, transparent)",
  },
  danger: {
    background: "color-mix(in oklch, var(--destructive) 14%, var(--paper))",
    color: "var(--destructive)",
    border: "1px solid color-mix(in oklch, var(--destructive) 32%, transparent)",
  },
};

export function StatusBadge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
      style={TONE_STYLE[tone]}
    >
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "info",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}) {
  return (
    <div className="s8-card !p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
        <span
          aria-hidden
          className="h-2.5 w-2.5 rounded-full"
          style={{ background: TONE_STYLE[tone].color }}
        />
      </div>
      <p className="mt-2 font-serif text-3xl leading-none text-primary">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-6 py-12 text-center"
      style={{
        border: "1px dashed var(--input)",
        background: "color-mix(in oklch, var(--paper) 80%, var(--cream))",
      }}
    >
      <div
        aria-hidden
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full font-serif text-xl"
        style={{ background: "var(--gold-soft)", color: "var(--accent-foreground)" }}
      >
        ✦
      </div>
      <h3 className="font-serif text-lg">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl">{title}</h1>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 ${className}`}
    />
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold text-primary transition-colors hover:bg-accent disabled:opacity-50 ${className}`}
    />
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="s8-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function TableWrap({ children }: { children: ReactNode }) {
  return (
    <div className="s8-card overflow-x-auto !p-0">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-border px-3 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  );
}

export function Td({ children }: { children: ReactNode }) {
  return <td className="border-b border-border/60 px-3 py-3 align-middle">{children}</td>;
}

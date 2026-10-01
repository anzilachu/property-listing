import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

export function Button({
  className,
  variant = "primary",
  busy,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  busy?: boolean;
}) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold tracking-[-0.01em] transition duration-150 focus:outline-none focus:ring-4 focus:ring-black/10 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[#101114] text-white shadow-[0_8px_20px_rgba(16,17,20,0.12)] hover:bg-black dark:bg-white dark:text-[#101114]",
        variant === "secondary" && "border border-black/10 bg-white text-[#101114] hover:border-black/15 hover:bg-[#fbfbfa] dark:border-white/10 dark:bg-white/[0.06] dark:text-white",
        variant === "danger" && "border border-red-200 bg-white text-red-600 hover:bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200",
        variant === "ghost" && "text-[#62646c] hover:bg-black/[0.04] hover:text-[#101114] dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white",
        className,
      )}
      {...props}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium text-[#3a3c42] dark:text-white/82", className)}>
      <span className="text-[13px]">{label}</span>
      <input
        className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-medium text-[#101114] outline-none transition placeholder:text-[#a0a2aa] focus:border-black/20 focus:ring-4 focus:ring-black/[0.035] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
        {...props}
      />
      {hint ? <span className="text-xs font-medium text-[#858790] dark:text-white/50">{hint}</span> : null}
    </label>
  );
}

export function SelectField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm font-medium text-[#3a3c42] dark:text-white/82", className)}>
      <span className="text-[13px]">{label}</span>
      <select className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-medium text-[#101114] outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/[0.035] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
        {children}
      </select>
    </label>
  );
}

export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-black/10 bg-white p-5 shadow-[0_1px_2px_rgba(16,17,20,0.035)] dark:border-white/10 dark:bg-white/[0.055]", className)}>
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-black/[0.06] pb-4 dark:border-white/10">
        <div>
          {eyebrow ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#858790]">{eyebrow}</p> : null}
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#101114] dark:text-white">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-56 place-items-center rounded-2xl border border-dashed border-black/10 bg-white p-8 text-center dark:border-white/15 dark:bg-white/[0.03]">
      <div className="max-w-md">
        <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#101114] dark:text-white">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[#73757e] dark:text-white/60">{body}</p>
      </div>
    </div>
  );
}

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "process";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center rounded-lg border px-2.5 text-xs font-semibold",
        tone === "neutral" && "border-black/10 bg-[#f7f7f5] text-[#62646c] dark:border-white/10 dark:bg-white/10 dark:text-white/72",
        tone === "success" && "border-[#bdeed7] bg-[#eafbf2] text-[#0b8b60] dark:text-emerald-200",
        tone === "danger" && "border-[#f6d2d4] bg-[#fff1f1] text-[#c82f3d] dark:text-red-200",
        tone === "process" && "border-[#d6e4ff] bg-[#eef5ff] text-[#3861d6] dark:text-blue-200",
      )}
    >
      {children}
    </span>
  );
}

export function SkeletonRows({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid h-14 animate-pulse gap-3 rounded-xl bg-white p-3 ring-1 ring-black/10 dark:bg-white/5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((__, col) => (
            <span key={col} className="rounded bg-ink-950/8 dark:bg-white/10" />
          ))}
        </div>
      ))}
    </div>
  );
}

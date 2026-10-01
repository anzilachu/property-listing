import { Building2, Copy, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "./ui";

export function AdminTopBrand({ email, onSignOut }: { email?: string; onSignOut?: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-[#f7f7f5]/82 px-5 backdrop-blur-xl dark:border-white/10 dark:bg-[#101114]/82">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#101114] text-white">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-semibold tracking-[-0.03em] text-[#101114] dark:text-white">PropHub Admin</div>
            <div className="text-xs font-medium text-[#858790] dark:text-white/50">Client manager</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {email ? <span className="hidden text-sm font-semibold text-ink-700/65 sm:inline">{email}</span> : null}
          {onSignOut ? <Button variant="secondary" onClick={onSignOut}><LogOut className="h-4 w-4" /> Sign out</Button> : null}
        </div>
      </div>
    </header>
  );
}

export function ClientHeader({
  agencyName,
  logoUrl,
  lastSynced,
  theme,
  onThemeToggle,
  onRefresh,
}: {
  agencyName: string;
  logoUrl?: string | null;
  lastSynced?: string;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f7f7f5]/82 px-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#101114]/82">
      <div className="flex h-16 items-center justify-between lg:px-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-[var(--client-accent)] text-white">
            {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-[-0.03em] text-[#101114] dark:text-white">{agencyName}</div>
            <div className="truncate text-xs font-medium text-[#858790] dark:text-white/50">Bitrix24 listing console</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="hidden h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-xs font-semibold text-[#62646c] sm:inline-flex dark:border-white/10 dark:bg-white/[0.06] dark:text-white/70"
            onClick={onRefresh}
          >
            <Copy className="h-3.5 w-3.5" />
            {lastSynced ? `Synced ${lastSynced}` : "Refresh"}
          </button>
          <button
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.06]"
            onClick={onThemeToggle}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}

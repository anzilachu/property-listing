import { ShieldAlert } from "lucide-react";
import { EmptyState } from "../components/ui";

export function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="w-full max-w-xl rounded-lg border border-ink-950/10 bg-white/80 p-8 text-center shadow-lift backdrop-blur dark:border-white/10 dark:bg-white/[0.045]">
        <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-md bg-red-500/10 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <EmptyState
          title="Unauthorised access"
          body="Open this app from your Bitrix portal. PropHub blocks direct browser access and portals that do not match the registered client."
        />
      </div>
    </main>
  );
}

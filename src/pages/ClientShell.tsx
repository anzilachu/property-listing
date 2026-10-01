import { NavLink, Outlet, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Home, ListChecks, UsersRound } from "lucide-react";
import { ClientHeader } from "../components/TopBrand";
import { EmptyState, SkeletonRows } from "../components/ui";
import { fetchPublicClientInfo, issueClientToken } from "../lib/api";
import { localPreviewEnabled } from "../lib/devPreview";
import { cn, getAncestorOrigin, hostFromOrigin } from "../lib/utils";
import { UnauthorizedPage } from "./UnauthorizedPage";

export type ClientOutletContext = {
  clientId: string;
  token: string;
  accentColor: string;
};

export function ClientShell() {
  const params = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routeClientKey = params.clientId ?? "";
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | undefined>();

  const publicInfo = useQuery({
    queryKey: ["public-client-info", routeClientKey],
    queryFn: () => fetchPublicClientInfo(routeClientKey),
    enabled: !!routeClientKey,
    staleTime: 0,
    refetchInterval: 3_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const info = publicInfo.data;
    if (!info) return;
    const ancestorOrigin = getAncestorOrigin();
    const ancestorHost = ancestorOrigin ? hostFromOrigin(ancestorOrigin) : "";

    // Local development preview: bypass the Bitrix iframe-only guard so the UI
    // can be opened directly at http://127.0.0.1:5173/{clientSlug}.
    if (!localPreviewEnabled && (!ancestorOrigin || ancestorHost !== info.portalHost)) {
      setAuthError("Open this app from the registered Bitrix portal.");
      return;
    }
    setAuthError(null);
    setTheme(info.theme);
    document.documentElement.style.setProperty("--client-accent", info.accentColor);
    issueClientToken(info.clientId, ancestorOrigin ?? window.location.origin)
      .then((issued) => {
        setToken(issued.token);
        setLastSynced("just now");
      })
      .catch((error) => setAuthError(error.message));
  }, [routeClientKey, publicInfo.data]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    return () => document.documentElement.classList.remove("dark");
  }, [theme]);

  const navItems = useMemo(() => [
    { to: `/${routeClientKey}`, end: true, label: "Listings", icon: ListChecks },
    { to: `/${routeClientKey}/agents`, label: "Agents", icon: UsersRound },
    { to: `/${routeClientKey}/owners`, label: "Owners", icon: Home },
  ], [routeClientKey]);

  if (publicInfo.isLoading) {
    return <main className="p-6"><SkeletonRows rows={8} cols={4} /></main>;
  }

  if (publicInfo.error) {
    return <main className="grid min-h-screen place-items-center p-5"><EmptyState title="Client not found" body={publicInfo.error.message} /></main>;
  }

  if (authError) {
    return <UnauthorizedPage />;
  }

  if (!publicInfo.data || !token) {
    return <main className="p-6"><SkeletonRows rows={6} cols={4} /></main>;
  }

  return (
    <div className="min-h-screen text-[#101114] dark:text-white">
      <ClientHeader
        agencyName={publicInfo.data.companyName}
        logoUrl={publicInfo.data.logoUrl}
        lastSynced={lastSynced}
        theme={theme}
        onThemeToggle={() => setTheme((current) => current === "light" ? "dark" : "light")}
        onRefresh={() => {
          queryClient.invalidateQueries();
          setLastSynced("just now");
        }}
      />
      <div className="grid lg:grid-cols-[248px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r border-black/10 bg-white/55 px-4 py-5 backdrop-blur-xl lg:block dark:border-white/10 dark:bg-white/[0.025]">
          <div className="mb-8 flex items-center gap-3 px-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#101114] text-white">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[-0.03em]">PropHub</div>
              <div className="text-xs font-medium text-[#858790] dark:text-white/50">{publicInfo.data.companyName}</div>
            </div>
          </div>
          <nav className="grid gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition",
                  isActive ? "bg-[#101114] text-white" : "text-[#73757e] hover:bg-black/[0.04] hover:text-[#101114] dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 px-4 py-6 md:px-7">
          <Outlet context={{ clientId: publicInfo.data.clientId, token, accentColor: publicInfo.data.accentColor } satisfies ClientOutletContext} />
        </main>
      </div>
      <div className="fixed bottom-3 left-3 right-3 z-30 grid grid-cols-3 gap-2 rounded-2xl border border-black/10 bg-white/90 p-2 shadow-[0_16px_40px_rgba(16,17,20,0.10)] backdrop-blur-xl lg:hidden dark:border-white/10 dark:bg-[#15161a]/90">
        {navItems.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-semibold text-[#62646c] dark:text-white/72"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

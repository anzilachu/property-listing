import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Copy, KeyRound, Plus, Settings2, Trash2, X } from "lucide-react";
import { AdminTopBrand } from "../components/TopBrand";
import { Button, EmptyState, Field, Panel, SelectField, SkeletonRows, StatusChip } from "../components/ui";
import { DataTable, type Column } from "../components/DataTable";
import { createAdminClient, deleteAdminClient, fetchAdminClients, getCachedAdminClients, updateAdminClient } from "../lib/api";
import { supabase } from "../lib/supabase";
import type { ClientSummary } from "../types/domain";

const reservedClientIds = new Set(["admin", "api", "login", "assets", "auth", "functions", "static"]);

function slugify(value: string) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return "";
  return slug.length === 1 ? `${slug}-agency` : slug;
}

function internalClientIdPreview(value: string) {
  return (slugify(value) || "agency-name").replace(/-/g, "_");
}

function isAdminSessionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message === "Admin session required." || error.message === "Invalid admin session.";
}

type SettingsFormState = {
  companyName: string;
  theme: "light" | "dark";
  accentColor: string;
  bitrixWebhookUrl: string;
  entityTypeId: string;
  pfAccounts: Array<{
    label: string;
    clientId: string;
    secret: string;
  }>;
  bayutAccounts: Array<{
    label: string;
    apiKey: string;
  }>;
};

function blankPfAccount() {
  return { label: "", clientId: "", secret: "" };
}

function blankBayutAccount() {
  return { label: "", apiKey: "" };
}

function initialSettings(client: ClientSummary): SettingsFormState {
  const pfAccounts = client.accounts?.pf ?? [];
  const bayutAccounts = client.accounts?.bayut ?? [];
  return {
    companyName: client.companyName,
    theme: client.general?.theme ?? "light",
    accentColor: client.general?.accentColor ?? "#0c8f65",
    bitrixWebhookUrl: "",
    entityTypeId: String(client.bitrix?.entityTypeId ?? 1052),
    pfAccounts: pfAccounts.length
      ? pfAccounts.map((account) => ({ ...account, secret: "" }))
      : [blankPfAccount()],
    bayutAccounts: bayutAccounts.length
      ? bayutAccounts.map((account) => ({ ...account, apiKey: "" }))
      : [blankBayutAccount()],
  };
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [modal, setModal] = useState<"create" | "settings" | null>(null);
  const [selected, setSelected] = useState<ClientSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientSummary | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [createSuccess, setCreateSuccess] = useState<ClientSummary | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState | null>(null);
  const [settingsDirty, setSettingsDirty] = useState(false);

  const clients = useQuery({
    queryKey: ["admin-clients"],
    queryFn: fetchAdminClients,
    enabled: !!supabase,
    initialData: getCachedAdminClients,
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 2,
  });

  const adminSessionMissing = isAdminSessionError(clients.error);

  useEffect(() => {
    if (!adminSessionMissing) return;
    const redirect = `${location.pathname}${location.search}`;
    navigate(`/admin/login?redirect=${encodeURIComponent(redirect)}`, { replace: true });
  }, [adminSessionMissing, location.pathname, location.search, navigate]);

  const createMutation = useMutation({
    mutationFn: createAdminClient,
    onSuccess: (client) => {
      setCreateSuccess(client);
      setCompanyName("");
      setModal(null);
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminClient,
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ targetClientId, input }: { targetClientId: string; input: Record<string, unknown> }) =>
      updateAdminClient(targetClientId, input),
    onSuccess: (client) => {
      setSelected(client);
      setSettingsForm((current) => current ? {
        ...current,
        companyName: client.companyName,
        theme: client.general.theme,
        accentColor: client.general.accentColor,
        entityTypeId: String(client.bitrix.entityTypeId),
        bitrixWebhookUrl: "",
        pfAccounts: client.accounts.pf.length
          ? client.accounts.pf.map((account) => ({ ...account, secret: "" }))
          : current.pfAccounts.map((account) => ({ ...account, secret: "" })),
        bayutAccounts: client.accounts.bayut.length
          ? client.accounts.bayut.map((account) => ({ ...account, apiKey: "" }))
          : current.bayutAccounts.map((account) => ({ ...account, apiKey: "" })),
      } : current);
      setSettingsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["admin-clients"] });
      queryClient.invalidateQueries({ queryKey: ["public-client-info", client.clientId] });
      queryClient.invalidateQueries({ queryKey: ["public-client-info", client.publicSlug] });
    },
  });

  const openSettings = useCallback((client: ClientSummary) => {
    setSelected(client);
    setSettingsForm(initialSettings(client));
    setSettingsDirty(false);
    updateMutation.reset();
    setModal("settings");
  }, [updateMutation]);

  useEffect(() => {
    if (!createSuccess) return;
    const timeout = window.setTimeout(() => setCreateSuccess(null), 6500);
    return () => window.clearTimeout(timeout);
  }, [createSuccess]);

  const columns = useMemo<Column<ClientSummary>[]>(() => [
    {
      key: "clientId",
      header: "Client ID",
      render: (client) => <span className="font-mono text-sm font-black text-[var(--client-accent)]">{client.clientId}</span>,
    },
    { key: "company", header: "Agency", render: (client) => <span className="font-bold">{client.companyName}</span> },
    {
      key: "integrations",
      header: "Integrations",
      render: (client) => (
        <div className="flex flex-wrap gap-2">
          <StatusChip tone={client.integrations.bitrix ? "success" : "neutral"}>Bitrix {client.integrations.bitrix ? "✓" : "off"}</StatusChip>
          <StatusChip tone={client.integrations.pfAccounts ? "success" : "neutral"}>PF {client.integrations.pfAccounts ? `✓ (${client.integrations.pfAccounts})` : "off"}</StatusChip>
          <StatusChip tone={client.integrations.bayutAccounts || client.integrations.dubizzleAccounts ? "success" : "neutral"}>Bayut/Dubizzle {client.integrations.bayutAccounts ? `✓ (${client.integrations.bayutAccounts})` : "off"}</StatusChip>
        </div>
      ),
    },
    {
      key: "link",
      header: "Client Link",
      render: (client) => (
        <button className="inline-flex max-w-72 items-center gap-2 truncate rounded-md bg-ink-950/5 px-2.5 py-1.5 text-xs font-bold text-ink-700" onClick={() => navigator.clipboard.writeText(client.link)}>
          <Copy className="h-3.5 w-3.5" />
          <span className="truncate">{client.link}</span>
        </button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (client) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => openSettings(client)}><Settings2 className="h-4 w-4" /> Configure</Button>
          <Button
            variant="danger"
            busy={deleteMutation.isPending && deleteMutation.variables === client.clientId}
            onClick={() => {
              deleteMutation.reset();
              setDeleteTarget(client);
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      ),
    },
  ], [deleteMutation, openSettings]);

  function onCreateSubmit(event: FormEvent) {
    event.preventDefault();
    const previewSlug = slugify(companyName);
    if (reservedClientIds.has(previewSlug)) {
      createMutation.reset();
      return;
    }
    createMutation.mutate({ companyName });
  }

  function updateSettingsField<Key extends keyof SettingsFormState>(key: Key, value: SettingsFormState[Key]) {
    setSettingsDirty(true);
    updateMutation.reset();
    setSettingsForm((current) => current ? { ...current, [key]: value } : current);
  }

  function updatePfAccount(index: number, key: keyof SettingsFormState["pfAccounts"][number], value: string) {
    setSettingsDirty(true);
    updateMutation.reset();
    setSettingsForm((current) => current ? {
      ...current,
      pfAccounts: current.pfAccounts.map((account, accountIndex) =>
        accountIndex === index ? { ...account, [key]: value } : account
      ),
    } : current);
  }

  function updateBayutAccount(index: number, key: keyof SettingsFormState["bayutAccounts"][number], value: string) {
    setSettingsDirty(true);
    updateMutation.reset();
    setSettingsForm((current) => current ? {
      ...current,
      bayutAccounts: current.bayutAccounts.map((account, accountIndex) =>
        accountIndex === index ? { ...account, [key]: value } : account
      ),
    } : current);
  }

  function addPfAccount() {
    setSettingsDirty(true);
    updateMutation.reset();
    setSettingsForm((current) => current ? { ...current, pfAccounts: [...current.pfAccounts, blankPfAccount()] } : current);
  }

  function addBayutAccount() {
    setSettingsDirty(true);
    updateMutation.reset();
    setSettingsForm((current) => current ? { ...current, bayutAccounts: [...current.bayutAccounts, blankBayutAccount()] } : current);
  }

  function removePfAccount(index: number) {
    setSettingsDirty(true);
    updateMutation.reset();
    setSettingsForm((current) => current ? {
      ...current,
      pfAccounts: current.pfAccounts.filter((_, accountIndex) => accountIndex !== index),
    } : current);
  }

  function removeBayutAccount(index: number) {
    setSettingsDirty(true);
    updateMutation.reset();
    setSettingsForm((current) => current ? {
      ...current,
      bayutAccounts: current.bayutAccounts.filter((_, accountIndex) => accountIndex !== index),
    } : current);
  }

  function onSettingsSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selected || !settingsForm) return;

    updateMutation.mutate({
      targetClientId: selected.clientId,
      input: {
        companyName: settingsForm.companyName,
        general: {
          theme: settingsForm.theme,
          accent: settingsForm.accentColor,
        },
        bitrix: {
          entityTypeId: Number(settingsForm.entityTypeId) || 1052,
          webhookUrl: settingsForm.bitrixWebhookUrl || undefined,
        },
        pfAccounts: settingsForm.pfAccounts.filter((account) => account.label || account.clientId || account.secret),
        bayutAccounts: settingsForm.bayutAccounts.filter((account) => account.label || account.apiKey),
      },
    });
  }

  return (
    <div className="min-h-screen p-3 md:p-5">
      <AdminTopBrand
        email={undefined}
        onSignOut={supabase ? () => supabase!.auth.signOut().then(() => window.location.assign("/admin/login")) : undefined}
      />
      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-4xl font-semibold tracking-[-0.055em] text-[#101114] dark:text-white">Clients & integrations</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#73757e] dark:text-white/55">Manage registered Bitrix portals, iframe links, mappings and encrypted integration settings.</p>
          </div>
          <Button onClick={() => { setCompanyName(""); setCreateSuccess(null); createMutation.reset(); setModal("create"); }}>
            <Plus className="h-4 w-4" /> Add new client
          </Button>
        </div>

        {createSuccess ? (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 shadow-hairline">
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-100">{createSuccess.companyName} created successfully.</p>
              <p className="mt-1 max-w-2xl truncate font-mono text-xs font-semibold text-emerald-800/70 dark:text-emerald-100/70">{createSuccess.link}</p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md bg-white/75 px-3 text-xs font-bold text-emerald-800 shadow-hairline transition hover:bg-white dark:bg-white/10 dark:text-emerald-100"
              onClick={() => navigator.clipboard.writeText(createSuccess.link)}
            >
              <Copy className="h-3.5 w-3.5" />
              Copy link
            </button>
          </div>
        ) : null}

        {!supabase ? (
          <EmptyState title="Supabase is not configured" body="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local after creating the Supabase project." />
        ) : clients.isLoading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : adminSessionMissing ? (
          <SkeletonRows rows={5} cols={5} />
        ) : clients.error ? (
          <EmptyState title="Could not load clients" body={clients.error.message} />
        ) : clients.data?.length ? (
          <DataTable rows={clients.data} columns={columns} />
        ) : (
          <EmptyState title="No clients yet" body="Create the first agency client to generate its Bitrix iframe URL and store its encrypted webhook settings." />
        )}
      </main>

      {modal === "create" ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#101114]/30 p-4 backdrop-blur-sm">
          <Panel title="Create new client" eyebrow="Tenant setup" className="w-full max-w-3xl">
            <form className="grid gap-5" onSubmit={onCreateSubmit}>
              <Field label="Agency / company name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required placeholder="Type company name" />
              <div className="rounded-md border border-ink-950/10 bg-white/65 p-4 text-sm shadow-hairline dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#858790] dark:text-white/50">Client URL preview</p>
                <p className="mt-2 font-mono text-sm font-semibold text-[#101114] dark:text-white">
                  /{slugify(companyName) || "agency-name"}
                </p>
                <p className="mt-2 text-xs font-semibold text-ink-700/60 dark:text-ivory-100/55">
                  This is the agency-facing link. If it is already used, PropHub will automatically create the next available version, such as /{slugify(companyName) || "agency-name"}-2.
                </p>
              </div>
              <div className="rounded-md border border-ink-950/10 bg-white/65 p-4 text-sm shadow-hairline dark:border-white/10 dark:bg-white/5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#858790] dark:text-white/50">Internal Client ID</p>
                <p className="mt-2 font-mono text-sm font-semibold text-[#101114] dark:text-white">
                  {internalClientIdPreview(companyName)}_###
                </p>
                <p className="mt-2 text-xs font-semibold text-ink-700/60 dark:text-ivory-100/55">
                  PropHub generates this private tenant ID automatically with a random three-digit suffix, for example {internalClientIdPreview(companyName)}_482.
                </p>
              </div>
              {reservedClientIds.has(slugify(companyName)) ? <p className="rounded-md bg-red-500/10 p-3 text-sm font-bold text-red-700">This agency name generates a reserved URL. Please use a more specific company name.</p> : null}
              {createMutation.error ? <p className="rounded-md bg-red-500/10 p-3 text-sm font-bold text-red-700">{createMutation.error.message}</p> : null}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
                <Button type="submit" busy={createMutation.isPending}>Create client</Button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {modal === "settings" && selected && settingsForm ? (
        <div className="fixed inset-0 z-50 overflow-auto bg-[#101114]/30 p-4 backdrop-blur-sm">
          <Panel title="Integration settings" eyebrow={selected.clientId} className="mx-auto my-8 w-full max-w-6xl">
            <form className="grid gap-6" onSubmit={onSettingsSubmit}>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Agency name" value={settingsForm.companyName} onChange={(event) => updateSettingsField("companyName", event.target.value)} />
                <label className="grid gap-2 text-sm font-semibold text-ink-800 dark:text-ivory-100">
                  <span>Theme preference</span>
                  <select
                    className="h-11 rounded-md border border-ink-950/10 bg-white/80 px-3 text-sm font-medium text-ink-950 shadow-hairline outline-none transition focus:border-emerald-500/60 focus:ring-4 focus:ring-emerald-500/10 dark:border-white/10 dark:bg-white/5 dark:text-ivory-50"
                    value={settingsForm.theme}
                    onChange={(event) => updateSettingsField("theme", event.target.value as SettingsFormState["theme"])}
                  >
                    <option value="light">Light Mode</option>
                    <option value="dark">Dark Mode</option>
                  </select>
                </label>
                <Field label="Accent color" type="color" value={settingsForm.accentColor} onChange={(event) => updateSettingsField("accentColor", event.target.value)} />
              </div>
              <Panel title="Bitrix24 CRM" eyebrow="Live data source">
                <div className="grid gap-4 md:grid-cols-[1fr_180px]">
                  <Field
                    label="Inbound webhook URL"
                    value={settingsForm.bitrixWebhookUrl}
                    onChange={(event) => updateSettingsField("bitrixWebhookUrl", event.target.value)}
                    placeholder="Leave blank to keep existing encrypted webhook"
                  />
                  <Field label="SPA entityTypeId" value={settingsForm.entityTypeId} onChange={(event) => updateSettingsField("entityTypeId", event.target.value)} />
                  <Button variant="secondary" type="button" className="md:col-span-2"><KeyRound className="h-4 w-4" /> Test connection</Button>
                </div>
              </Panel>
              <Panel title="Field mapping" eyebrow="Auto-detected">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {["Reference number", "Price in AED", "Original images", "Listing Owner", "PF Location Name", "Bayut Listing ID"].map((field) => (
                    <SelectField key={field} label={field}><option>Auto-detect from Bitrix title</option><option>Manual override</option></SelectField>
                  ))}
                </div>
              </Panel>
              <Panel
                title="Property Finder (PF) Accounts"
                action={<Button type="button" variant="danger" onClick={addPfAccount}><Plus className="h-4 w-4" /> Add PF Account</Button>}
              >
                <div className="grid gap-4">
                  {settingsForm.pfAccounts.length ? settingsForm.pfAccounts.map((account, index) => (
                    <div key={index} className="rounded-lg border border-red-500/10 bg-red-500/[0.025] p-4 shadow-hairline dark:border-red-300/10 dark:bg-red-300/[0.035]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-red-700 dark:text-red-200">Account #{index + 1}</span>
                        <Button type="button" variant="ghost" onClick={() => removePfAccount(index)}><X className="h-4 w-4" /> Remove Account</Button>
                      </div>
                      <div className="grid gap-4 lg:grid-cols-3">
                        <Field label="Account Label / Name" value={account.label} onChange={(event) => updatePfAccount(index, "label", event.target.value)} placeholder="Offplan" />
                        <Field label="PF Client ID" value={account.clientId} onChange={(event) => updatePfAccount(index, "clientId", event.target.value)} placeholder="Client ID" />
                        <Field label="PF Client Secret" type="password" value={account.secret} onChange={(event) => updatePfAccount(index, "secret", event.target.value)} placeholder={account.clientId ? "Leave blank to keep saved secret" : "Stored encrypted when saved"} />
                      </div>
                    </div>
                  )) : (
                    <EmptyState title="No PF accounts" body="Add one or more Property Finder accounts for this client." />
                  )}
                </div>
              </Panel>
              <Panel
                title="Bayut / Dubizzle Accounts"
                action={<Button type="button" variant="secondary" onClick={addBayutAccount}><Plus className="h-4 w-4" /> Add Bayut / Dubizzle Account</Button>}
              >
                <div className="grid gap-4">
                  {settingsForm.bayutAccounts.length ? settingsForm.bayutAccounts.map((account, index) => (
                    <div key={index} className="rounded-lg border border-emerald-500/10 bg-emerald-500/[0.025] p-4 shadow-hairline dark:border-emerald-300/10 dark:bg-emerald-300/[0.035]">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-200">Account #{index + 1}</span>
                        <Button type="button" variant="ghost" onClick={() => removeBayutAccount(index)}><X className="h-4 w-4" /> Remove Account</Button>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Account Label / Name" value={account.label} onChange={(event) => updateBayutAccount(index, "label", event.target.value)} placeholder="Primo Capital" />
                        <Field label="API Key" type="password" value={account.apiKey} onChange={(event) => updateBayutAccount(index, "apiKey", event.target.value)} placeholder={account.label ? "Leave blank to keep saved API key" : "Stored encrypted when saved"} />
                      </div>
                    </div>
                  )) : (
                    <EmptyState title="No Bayut / Dubizzle accounts" body="Add one or more Bayut or Dubizzle accounts for this client." />
                  )}
                </div>
              </Panel>
              {updateMutation.error ? <p className="rounded-md bg-red-500/10 p-3 text-sm font-bold text-red-700">{updateMutation.error.message}</p> : null}
              {updateMutation.isSuccess ? <p className="rounded-md bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700">Integration settings saved.</p> : null}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setModal(null)}>{updateMutation.isSuccess && !settingsDirty ? "Done" : "Close"}</Button>
                <Button type="submit" busy={updateMutation.isPending} disabled={updateMutation.isSuccess && !settingsDirty}>
                  {updateMutation.isSuccess && !settingsDirty ? <Check className="h-4 w-4" /> : null}
                  {updateMutation.isSuccess && !settingsDirty ? "Saved" : "Save integration settings"}
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-[#101114]/35 p-4 backdrop-blur-sm">
          <Panel title="Delete client?" eyebrow="Confirmation required" className="w-full max-w-lg">
            <div className="grid gap-5">
              <div className="rounded-xl border border-red-500/15 bg-red-500/[0.055] p-4">
                <p className="text-sm font-semibold leading-6 text-[#101114] dark:text-white">
                  You are about to delete <span className="font-bold">{deleteTarget.companyName}</span>.
                </p>
                <p className="mt-2 text-sm leading-6 text-[#73757e] dark:text-white/60">
                  This removes the PropHub client record and integration settings. It does not delete anything inside Bitrix.
                </p>
              </div>
              <div className="rounded-xl border border-black/10 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#858790]">Client ID</p>
                <p className="mt-1 truncate font-mono text-sm font-semibold text-[#101114] dark:text-white">{deleteTarget.clientId}</p>
              </div>
              {deleteMutation.error ? (
                <p className="rounded-md bg-red-500/10 p-3 text-sm font-bold text-red-700">{deleteMutation.error.message}</p>
              ) : null}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.reset();
                    setDeleteTarget(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  busy={deleteMutation.isPending && deleteMutation.variables === deleteTarget.clientId}
                  onClick={() => deleteMutation.mutate(deleteTarget.clientId)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete client
                </Button>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

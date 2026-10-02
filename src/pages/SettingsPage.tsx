import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { Building2, Check, ImagePlus, X } from "lucide-react";
import { Button, Field, Panel } from "../components/ui";
import { updateClientGeneralSettings } from "../lib/api";
import type { PublicClientInfo } from "../types/domain";
import type { ClientOutletContext } from "./ClientShell";

const logoLimitBytes = 500 * 1024;

function readLogoFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/)) {
      reject(new Error("Upload a PNG, JPG, WEBP, or SVG logo."));
      return;
    }
    if (file.size > logoLimitBytes) {
      reject(new Error("Logo must be under 500 KB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read logo file."));
    reader.readAsDataURL(file);
  });
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { clientId, routeClientKey, token, publicInfo } = useOutletContext<ClientOutletContext>();
  const [accountName, setAccountName] = useState(publicInfo.accountName ?? publicInfo.companyName);
  const [companyName, setCompanyName] = useState(publicInfo.companyName);
  const [logoUrl, setLogoUrl] = useState<string | null>(publicInfo.logoUrl ?? null);
  const [theme, setTheme] = useState<"light" | "dark">(publicInfo.theme);
  const [accentColor, setAccentColor] = useState(publicInfo.accentColor);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    setAccountName(publicInfo.accountName ?? publicInfo.companyName);
    setCompanyName(publicInfo.companyName);
    setLogoUrl(publicInfo.logoUrl ?? null);
    setTheme(publicInfo.theme);
    setAccentColor(publicInfo.accentColor);
  }, [publicInfo]);

  const previewInfo = useMemo<PublicClientInfo>(() => ({
    ...publicInfo,
    accountName,
    companyName,
    logoUrl,
    theme,
    accentColor,
  }), [accountName, accentColor, companyName, logoUrl, publicInfo, theme]);

  const updateMutation = useMutation({
    mutationFn: () => updateClientGeneralSettings(clientId, token, {
      accountName,
      companyName,
      logoUrl,
      theme,
      accentColor,
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["public-client-info", routeClientKey], updated);
      queryClient.setQueryData(["public-client-info", updated.clientId], updated);
      queryClient.setQueryData(["public-client-info", updated.publicSlug], updated);
      document.documentElement.style.setProperty("--client-accent", updated.accentColor);
      document.documentElement.classList.toggle("dark", updated.theme === "dark");
    },
  });

  async function onLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileError(null);
    updateMutation.reset();
    try {
      setLogoUrl(await readLogoFile(file));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "Could not upload logo.");
    } finally {
      event.target.value = "";
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    updateMutation.mutate();
  }

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-4xl font-semibold tracking-[-0.055em]">Settings</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#73757e] dark:text-white/55">Manage this agency dashboard identity, logo, theme, and client accent color.</p>
      </div>

      <form className="grid gap-5" onSubmit={onSubmit}>
        <Panel title="General settings" eyebrow="Client branding">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="rounded-2xl border border-black/10 bg-[#fafaf9] p-4 dark:border-white/10 dark:bg-white/[0.035]">
              <div className="mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-3xl bg-[var(--client-accent)] text-white shadow-[0_16px_34px_rgba(16,17,20,0.12)]">
                {logoUrl ? <img src={logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-10 w-10" />}
              </div>
              <div className="mt-4 grid gap-2">
                <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-semibold text-[#101114] shadow-hairline transition hover:bg-[#fbfbfa] dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
                  <ImagePlus className="h-4 w-4" />
                  Upload logo
                  <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onLogoChange} />
                </label>
                {logoUrl ? (
                  <Button type="button" variant="ghost" onClick={() => { setLogoUrl(null); updateMutation.reset(); }}>
                    <X className="h-4 w-4" />
                    Remove logo
                  </Button>
                ) : null}
                {fileError ? <p className="rounded-md bg-red-500/10 p-3 text-xs font-bold text-red-700">{fileError}</p> : null}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Account name" value={accountName} onChange={(event) => { setAccountName(event.target.value); updateMutation.reset(); }} required />
                <Field label="Company name" value={companyName} onChange={(event) => { setCompanyName(event.target.value); updateMutation.reset(); }} required />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-[#3a3c42] dark:text-white/82">
                  <span className="text-[13px]">Color theme</span>
                  <select
                    className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-medium text-[#101114] outline-none transition focus:border-black/20 focus:ring-4 focus:ring-black/[0.035] dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                    value={theme}
                    onChange={(event) => { setTheme(event.target.value as "light" | "dark"); updateMutation.reset(); }}
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
                <Field label="Accent color" type="color" value={accentColor} onChange={(event) => { setAccentColor(event.target.value); updateMutation.reset(); }} />
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#858790]">Preview</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl text-white" style={{ backgroundColor: previewInfo.accentColor }}>
                    {previewInfo.logoUrl ? <img src={previewInfo.logoUrl} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="text-base font-semibold tracking-[-0.03em] text-[#101114] dark:text-white">{previewInfo.accountName || previewInfo.companyName}</p>
                    <p className="text-xs font-medium text-[#858790] dark:text-white/50">{previewInfo.companyName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        {updateMutation.error ? <p className="rounded-md bg-red-500/10 p-3 text-sm font-bold text-red-700">{updateMutation.error.message}</p> : null}
        {updateMutation.isSuccess ? <p className="rounded-md bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700">Settings saved.</p> : null}

        <div className="flex justify-end">
          <Button type="submit" busy={updateMutation.isPending} disabled={updateMutation.isSuccess} className="bg-[var(--client-accent)] hover:brightness-95 dark:bg-[var(--client-accent)] dark:text-white">
            {updateMutation.isSuccess ? <Check className="h-4 w-4" /> : null}
            {updateMutation.isSuccess ? "Saved" : "Save settings"}
          </Button>
        </div>
      </form>
    </section>
  );
}

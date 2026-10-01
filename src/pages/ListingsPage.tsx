import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Filter, Grid2X2, ImageOff, List, X } from "lucide-react";
import { CommandPalette } from "../components/CommandPalette";
import { DataTable, type Column } from "../components/DataTable";
import { Button, EmptyState, Field, SkeletonRows, StatusChip } from "../components/ui";
import { fetchListings, getCachedListings } from "../lib/api";
import { formatAed, formatDate } from "../lib/utils";
import type { ClientOutletContext } from "./ClientShell";
import type { Listing } from "../types/domain";

function statusTone(stage: Listing["stageSemantic"]) {
  if (stage === "success") return "success" as const;
  if (stage === "failure") return "danger" as const;
  if (stage === "process") return "process" as const;
  return "neutral" as const;
}

export function ListingsPage() {
  const { clientId, token } = useOutletContext<ClientOutletContext>();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);
  const [view, setView] = useState<"list" | "grid">("list");

  const listings = useQuery({
    queryKey: ["listings", clientId, search],
    queryFn: () => fetchListings(clientId, token, search),
    initialData: () => getCachedListings(clientId, search),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60,
  });

  const columns = useMemo<Column<Listing>[]>(() => [
    {
      key: "title",
      header: "Title",
      render: (listing) => (
        <div className="flex min-w-80 items-center gap-3">
          <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-black/[0.04] shadow-hairline dark:bg-white/10">
            {listing.thumbnailUrl ? <img src={listing.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <ImageOff className="h-5 w-5 text-ink-700/35" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold tracking-[-0.015em] text-[#101114] dark:text-white">{listing.title}</p>
            <p className="mt-1 font-mono text-xs font-medium text-[#8f929a] dark:text-white/45">{listing.reference ?? "No reference"}</p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", render: (listing) => <span>{listing.type ?? "—"}</span> },
    { key: "purpose", header: "Sale/Rent", render: (listing) => <span>{listing.purpose ?? "—"}</span> },
    { key: "specs", header: "Specs", render: (listing) => <span className="tabular">{listing.beds ?? "—"} bed · {listing.baths ?? "—"} bath · {listing.sizeSqft ?? "—"} sqft</span> },
    { key: "pfLocation", header: "PF Location", render: (listing) => <span>{listing.pfLocationName ?? "—"}</span> },
    { key: "bayutLocation", header: "Bayut Location", render: (listing) => <span>{listing.bayutLocationName ?? "—"}</span> },
    { key: "price", header: "Price", render: (listing) => <span className="tabular font-semibold text-[#101114] dark:text-white">{formatAed(listing.priceAed)}</span> },
    { key: "status", header: "Stage", render: (listing) => <StatusChip tone={statusTone(listing.stageSemantic)}>{listing.stageName}</StatusChip> },
    { key: "agent", header: "Agent", render: (listing) => <span>{listing.agentName ?? "—"}</span> },
    { key: "owner", header: "Owner", render: (listing) => <span>{listing.ownerName ?? "—"}</span> },
    { key: "updated", header: "Updated", render: (listing) => <span className="tabular text-xs">{formatDate(listing.updatedAt)}</span> },
    {
      key: "portals",
      header: "Portals",
      render: (listing) => (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(listing.portals).map(([portal, live]) => (
            <span key={portal} className={`h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-500" : "bg-ink-950/12 dark:bg-white/18"}`} title={portal} />
          ))}
        </div>
      ),
    },
  ], []);

  const rows = listings.data?.rows ?? [];

  return (
    <div className="grid gap-5">
      <CommandPalette onSearch={setSearch} />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-4xl font-semibold tracking-[-0.055em]">Listings</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#73757e] dark:text-white/55">Live Bitrix Smart Process data, normalised through PropHub Edge Functions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary"><Download className="h-4 w-4" /> Export</Button>
          <Button variant="secondary"><Filter className="h-4 w-4" /> Filters</Button>
          <Button variant={view === "list" ? "primary" : "secondary"} onClick={() => setView("list")}><List className="h-4 w-4" /></Button>
          <Button variant={view === "grid" ? "primary" : "secondary"} onClick={() => setView("grid")}><Grid2X2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_1px_2px_rgba(16,17,20,0.035)] dark:border-white/10 dark:bg-white/[0.045]">
        <div className="grid gap-3 lg:grid-cols-[1.3fr_repeat(5,1fr)]">
          <Field label="Search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or reference..." />
          {["Category", "Type", "Purpose", "Stage", "Agent"].map((label) => (
            <label key={label} className="grid gap-2 text-sm font-medium text-[#3a3c42] dark:text-white/82">
              <span className="text-[13px]">{label}</span>
              <select className="h-11 rounded-xl border border-black/10 bg-white px-3.5 text-sm font-medium shadow-hairline dark:border-white/10 dark:bg-white/5">
                <option>All</option>
              </select>
            </label>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Active Sales", "Active Rentals", "Unpublished"].map((preset) => <StatusChip key={preset}>{preset}</StatusChip>)}
        </div>
      </div>

      {listings.isLoading ? (
        <SkeletonRows rows={10} cols={7} />
      ) : listings.error ? (
        <EmptyState title="Could not load Bitrix listings" body={listings.error.message} />
      ) : listings.data?.missingMappings?.length ? (
        <EmptyState title="Field mapping needs attention" body={`Missing mappings: ${listings.data.missingMappings.join(", ")}. Refresh fields or set overrides in Admin.`} />
      ) : rows.length ? (
        view === "list" ? <DataTable rows={rows} columns={columns} onRowClick={setSelected} dense /> : <ListingGrid rows={rows} onSelect={setSelected} />
      ) : (
        <EmptyState title="No live listings returned" body="Once Bitrix is connected and mapped, live listings will appear here. PropHub does not seed demo listings in the client app." />
      )}

      <AnimatePresence>
        {selected ? (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            className="fixed bottom-0 right-0 top-0 z-40 w-full max-w-2xl overflow-auto border-l border-ink-950/10 bg-ivory-50 p-5 shadow-lift dark:border-white/10 dark:bg-ink-900"
          >
            <button className="mb-4 grid h-10 w-10 place-items-center rounded-md border border-ink-950/10 bg-white shadow-hairline dark:border-white/10 dark:bg-white/5" onClick={() => setSelected(null)} aria-label="Close">
              <X className="h-5 w-5" />
            </button>
            <div className="mb-5 aspect-[16/9] overflow-hidden rounded-lg bg-ink-950/5 shadow-hairline dark:bg-white/10">
              {selected.thumbnailUrl ? <img src={selected.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><ImageOff className="h-8 w-8 opacity-40" /></div>}
            </div>
            <h2 className="font-serif text-4xl font-semibold">{selected.title}</h2>
            <p className="mt-2 font-mono text-sm font-bold text-ink-700/55 dark:text-ivory-100/55">{selected.reference}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Price" value={formatAed(selected.priceAed)} />
              <Metric label="Stage" value={selected.stageName} />
              <Metric label="Specs" value={`${selected.beds ?? "—"} bed · ${selected.baths ?? "—"} bath`} />
            </div>
            <section className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#73757e] dark:text-white/55">Description</h3>
              <p className="whitespace-pre-line text-sm leading-7 text-ink-800 dark:text-ivory-100/78">{selected.descriptionEn ?? "No mapped English description returned from Bitrix."}</p>
            </section>
            <section className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#73757e] dark:text-white/55">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {(selected.amenities?.length ? selected.amenities : ["No mapped amenities"]).map((amenity) => <StatusChip key={amenity}>{amenity}</StatusChip>)}
              </div>
            </section>
          </motion.aside>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-950/10 bg-white/75 p-4 shadow-hairline dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#858790] dark:text-white/45">{label}</div>
      <div className="mt-2 text-base font-semibold tabular">{value}</div>
    </div>
  );
}

function ListingGrid({ rows, onSelect }: { rows: Listing[]; onSelect: (listing: Listing) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((listing) => (
        <button key={listing.id} className="overflow-hidden rounded-lg border border-ink-950/10 bg-white/78 text-left shadow-hairline transition hover:-translate-y-0.5 hover:shadow-lift dark:border-white/10 dark:bg-white/[0.045]" onClick={() => onSelect(listing)}>
          <div className="aspect-[16/10] bg-ink-950/5 dark:bg-white/10">
            {listing.thumbnailUrl ? <img src={listing.thumbnailUrl} alt="" className="h-full w-full object-cover" /> : null}
          </div>
          <div className="p-4">
            <p className="line-clamp-2 font-semibold tracking-[-0.015em]">{listing.title}</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="tabular text-sm font-semibold">{formatAed(listing.priceAed)}</span>
              <StatusChip tone={statusTone(listing.stageSemantic)}>{listing.stageName}</StatusChip>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState, SkeletonRows, StatusChip } from "../components/ui";
import { fetchAgents } from "../lib/api";
import { initials } from "../lib/utils";
import type { ClientOutletContext } from "./ClientShell";
import type { Person } from "../types/domain";

export function AgentsPage() {
  const { clientId, token } = useOutletContext<ClientOutletContext>();
  const agents = useQuery({ queryKey: ["agents", clientId], queryFn: () => fetchAgents(clientId, token) });
  const columns = useMemo<Column<Person>[]>(() => personColumns(true), []);

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-4xl font-semibold tracking-[-0.055em]">Agents</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#73757e] dark:text-white/55">Bitrix users with PF or Bayut IDs, listing counts and portal identifiers.</p>
      </div>
      {agents.isLoading ? <SkeletonRows rows={12} cols={5} /> : agents.error ? <EmptyState title="Could not load agents" body={agents.error.message} /> : agents.data?.length ? <DataTable rows={agents.data} columns={columns} dense /> : <EmptyState title="No agents returned" body="Agents are detected from Bitrix users with UF_USR_PF_ID or UF_USR_BAYUT_ID." />}
    </section>
  );
}

export function personColumns(agent: boolean): Column<Person>[] {
  const base: Column<Person>[] = [
    {
      key: "profile",
      header: agent ? "Agent Profile" : "Owner Profile",
      render: (person) => (
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-ink-950/8 text-xs font-black dark:bg-white/10">
            {person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(person.name)}
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[-0.015em] text-[#101114] dark:text-white">{person.name}</div>
            <div className="mt-1 text-xs font-medium text-[#8f929a] dark:text-white/45">{person.email ?? "No email"}</div>
          </div>
        </div>
      ),
    },
    { key: "position", header: "Work Position", render: (person) => <span>{person.workPosition ?? "—"}</span> },
  ];

  if (agent) {
    base.push(
      { key: "brn", header: "BRN", render: (person) => <span className="tabular">{person.brn ?? "—"}</span> },
      { key: "pf", header: "PF ID", render: (person) => <span className="tabular">{person.pfId ?? "—"}</span> },
      { key: "bayut", header: "Bayut ID", render: (person) => <span className="tabular">{person.bayutId ?? "—"}</span> },
      { key: "multi", header: "Mode", render: (person) => person.multiAccount ? <StatusChip tone="process">Multi-acc</StatusChip> : <StatusChip>Single</StatusChip> },
    );
  }

  base.push(
    { key: "bitrix", header: "Bitrix User ID", render: (person) => <span className="tabular">{person.bitrixUserId}</span> },
    { key: "count", header: "Listings", render: (person) => <span className="tabular font-semibold text-[#101114] dark:text-white">{person.listingCount ?? 0}</span> },
  );
  return base;
}

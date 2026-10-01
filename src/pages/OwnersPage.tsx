import { useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { DataTable, type Column } from "../components/DataTable";
import { EmptyState, SkeletonRows } from "../components/ui";
import { fetchOwners, getCachedOwners } from "../lib/api";
import type { ClientOutletContext } from "./ClientShell";
import type { Person } from "../types/domain";
import { personColumns } from "./AgentsPage";

export function OwnersPage() {
  const { clientId, token } = useOutletContext<ClientOutletContext>();
  const owners = useQuery({
    queryKey: ["owners", clientId],
    queryFn: () => fetchOwners(clientId, token),
    initialData: () => getCachedOwners(clientId),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5,
  });
  const columns = useMemo<Column<Person>[]>(() => personColumns(false), []);

  return (
    <section className="grid gap-5">
      <div>
        <h1 className="text-4xl font-semibold tracking-[-0.055em]">Owners</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#73757e] dark:text-white/55">Bitrix users without broker portal IDs, grouped separately from publishing agents.</p>
      </div>
      {owners.isLoading ? <SkeletonRows rows={12} cols={4} /> : owners.error ? <EmptyState title="Could not load owners" body={owners.error.message} /> : owners.data?.length ? <DataTable rows={owners.data} columns={columns} dense /> : <EmptyState title="No owners returned" body="Owners come from Bitrix users who do not have PF or Bayut IDs." />}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useItems, useSetItemActive } from "@/lib/hooks/useItems";
import { useSetting } from "@/lib/hooks/useInventory";
import { useSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput, Pagination } from "@/components/shared/toolbar";
import { ItemFormModal } from "@/components/inventory/ItemFormModal";
import { PriceHistoryModal } from "@/components/inventory/PriceHistoryModal";
import { ConfirmDialog } from "@/components/ui/modal";
import {
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  TableSkeleton,
} from "@/components/ui/primitives";
import { ActiveBadge, StockStatusBadge } from "@/components/shared/status";
import { IconBox, IconEdit, IconPlus, IconSort, IconTrend } from "@/components/ui/icons";
import { formatMoney, stockStatus } from "@/lib/utils";
import type { Item } from "@/lib/types";

const PAGE_SIZE = 8;
type SortKey = "name" | "price" | "stock";

export default function InventoryPage() {
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";

  const { data: items, isLoading, isError, error, refetch } = useItems();
  const { data: setting } = useSetting();
  const setActive = useSetItemActive();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Item | null>(null);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);

  const threshold = setting?.lowStockThreshold ?? 10;

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    const list = items.filter((i) => (q ? i.name.toLowerCase().includes(q) : true));
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "price") cmp = a.price - b.price;
      else cmp = a.stock - b.stock;
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [items, search, sort, dir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sort === key) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir("asc");
    }
  }

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(item: Item) {
    setEditing(item);
    setFormOpen(true);
  }

  async function confirmToggle() {
    if (!toggleTarget) return;
    try {
      await setActive.mutateAsync({ id: toggleTarget.id, isActive: !toggleTarget.isActive });
      setToggleTarget(null);
    } catch {
      /* toast handled */
    }
  }

  return (
    <div>
      <PageHeader
        title="Warehouse Inventory"
        description={
          isAdmin
            ? "Manage warehouse beverages, selling prices, and stock status."
            : "View beverages and current warehouse stock levels."
        }
        action={
          isAdmin ? (
            <Button onClick={openAdd}>
              <IconPlus size={16} />
              Add beverage
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search beverages…" />
          <p className="text-xs text-[var(--muted-foreground)]">
            Low-stock threshold: <span className="font-medium text-[var(--foreground)]">{threshold}</span>
          </p>
        </div>

        {isLoading ? (
          <TableSkeleton cols={isAdmin ? 7 : 6} rows={PAGE_SIZE} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matching beverages" : "No beverages yet"}
            description={search ? "Try a different search." : isAdmin ? "Add your first beverage to get started." : "No beverages have been added yet."}
            icon={<IconBox size={22} />}
            action={
              search ? (
                <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : isAdmin ? (
                <Button onClick={openAdd} size="sm"><IconPlus size={16} />Add beverage</Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs font-semibold text-[var(--muted-foreground)]">
                    <Th onClick={() => toggleSort("name")} active={sort === "name"}>Beverage</Th>
                    <th scope="col" className="px-4 py-3">Category</th>
                    <Th onClick={() => toggleSort("price")} active={sort === "price"}>Price</Th>
                    <Th onClick={() => toggleSort("stock")} active={sort === "stock"}>Warehouse</Th>
                    <th scope="col" className="px-4 py-3">Counter</th>
                    <th scope="col" className="px-4 py-3">Warehouse status</th>
                    <th scope="col" className="px-4 py-3">Active</th>
                    {isAdmin && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pageItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-[var(--surface-muted)]">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{item.name}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{item.category || "Other"}</td>
                      <td className="px-4 py-3 tabular-nums">{formatMoney(item.price)}</td>
                      <td className="px-4 py-3 tabular-nums font-medium">{item.stock}</td>
                      <td className="px-4 py-3 tabular-nums text-[var(--muted-foreground)]">{item.counterStock}</td>
                      <td className="px-4 py-3"><StockStatusBadge status={stockStatus(item, threshold)} /></td>
                      <td className="px-4 py-3"><ActiveBadge active={item.isActive} /></td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setHistoryItem(item)}
                              aria-label={`View price history for ${item.name}`}
                              title="Price history"
                            >
                              <IconTrend size={14} />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                              <IconEdit size={14} />
                              Edit
                            </Button>
                            <Button
                              variant={item.isActive ? "ghost" : "secondary"}
                              size="sm"
                              onClick={() => setToggleTarget(item)}
                            >
                              {item.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={current} totalPages={totalPages} total={filtered.length} onPage={setPage} />
          </>
        )}
      </Card>

      <ItemFormModal open={formOpen} onClose={() => setFormOpen(false)} item={editing} />
      <ConfirmDialog
        open={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        onConfirm={confirmToggle}
        loading={setActive.isPending}
        tone={toggleTarget?.isActive ? "danger" : "primary"}
        title={toggleTarget?.isActive ? "Deactivate beverage" : "Activate beverage"}
        confirmLabel={toggleTarget?.isActive ? "Deactivate" : "Activate"}
        message={
          toggleTarget?.isActive
            ? `"${toggleTarget?.name}" will no longer be available for ordering. Historical records are preserved.`
            : `"${toggleTarget?.name}" will become available for ordering again.`
        }
      />
      <PriceHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
    </div>
  );
}

function Th({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <th scope="col" className="px-4 py-3">
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 transition-colors hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        <span>{children}</span>
        <span className={active ? "text-[var(--brand)]" : "opacity-40"} aria-hidden="true">
          <IconSort size={13} />
        </span>
      </button>
    </th>
  );
}

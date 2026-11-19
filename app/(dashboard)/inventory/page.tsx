"use client";

import { useMemo, useState } from "react";
import { useItems, useSetItemActive, useUpdatePhysicalCheck } from "@/lib/hooks/useItems";
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
import { IconBox, IconCheck, IconEdit, IconPlus, IconSort, IconTrend } from "@/components/ui/icons";
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
  const updatePhysicalCheck = useUpdatePhysicalCheck();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const [physicalDrafts, setPhysicalDrafts] = useState<Record<string, string>>({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [toggleTarget, setToggleTarget] = useState<Item | null>(null);
  const [historyItem, setHistoryItem] = useState<Item | null>(null);

  const threshold = setting?.lowStockThreshold ?? 10;

  async function handleSavePhysicalCheck(itemId: string, val: string) {
    const trimmed = val.trim();
    const num = trimmed === "" ? null : Number(trimmed);
    if (num !== null && (isNaN(num) || num < 0)) return;
    await updatePhysicalCheck.mutateAsync({ id: itemId, physicalCount: num });
  }

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
    <div className="space-y-6">
      <PageHeader
        title="Warehouse Inventory"
        description={
          isAdmin
            ? "Manage warehouse beverages, selling prices, and reserve stock levels."
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

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-slate-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search beverages by name…"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Low-stock alert threshold:</span>
            <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 tabular-nums">
              {threshold} units
            </span>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={isAdmin ? 9 : 8} rows={PAGE_SIZE} />
        ) : isError ? (
          <ErrorBlock message={error?.message ?? "Failed to load"} onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? "No matching beverages" : "No beverages yet"}
            description={search ? "Try a different search." : isAdmin ? "Add your first beverage to get started." : "No beverages have been added yet."}
            icon={<IconBox size={24} />}
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
                  <tr className="border-b border-[var(--border)] bg-slate-50/80 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <Th onClick={() => toggleSort("name")} active={sort === "name"}>Beverage</Th>
                    <th scope="col" className="px-4 py-3">Category</th>
                    <Th onClick={() => toggleSort("price")} active={sort === "price"}>Price</Th>
                    <Th onClick={() => toggleSort("stock")} active={sort === "stock"}>Warehouse</Th>
                    <th scope="col" className="px-4 py-3 text-right">Counter Bar</th>
                    <th scope="col" className="px-4 py-3 text-center">Physical Check</th>
                    <th scope="col" className="px-4 py-3">Warehouse Status</th>
                    <th scope="col" className="px-4 py-3">Catalog Status</th>
                    {isAdmin && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {pageItems.map((item) => {
                    const draftVal = physicalDrafts[item.id];
                    const currentPhysical = draftVal !== undefined ? draftVal : (item.physicalCount !== null && item.physicalCount !== undefined ? String(item.physicalCount) : "");
                    const isPortioned = (item.shotsPerUnit ?? 1) > 1;

                    return (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{item.name}</span>
                            {isPortioned && (
                              <span
                                className="inline-flex items-center rounded-md border border-teal-200/80 bg-teal-50 px-1.5 py-0.5 text-[10px] font-bold text-teal-800"
                                title={`Portioned item: 1 bulk bottle = ${item.shotsPerUnit} shots`}
                              >
                                1 btl = {item.shotsPerUnit} shots
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/60">
                            {item.category || "Other"}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums text-slate-900">
                          {isPortioned ? (
                            <div>
                              <span className="font-bold text-slate-900">
                                {formatMoney(item.shotPrice ?? (item.price / item.shotsPerUnit))}
                              </span>
                              <span className="text-[10px] text-teal-700 font-semibold ml-0.5">/shot</span>
                              <div className="text-[11px] text-slate-400 font-normal">
                                {formatMoney(item.price)} /btl
                              </div>
                            </div>
                          ) : (
                            <span className="font-semibold text-slate-900">{formatMoney(item.price)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-bold text-slate-900">
                          {item.stock}
                          {isPortioned && <span className="text-xs text-slate-400 font-normal ml-1">btl</span>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-700 font-medium">
                          {item.counterStock}
                          {isPortioned && <span className="text-xs text-teal-700 font-semibold ml-1">shots</span>}
                        </td>
                        <td className="px-4 py-3">
                          {isAdmin ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                step="1"
                                className="w-16 rounded-md border border-slate-300 bg-white px-2 py-1 text-center text-xs font-bold text-slate-900 tabular-nums focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600"
                                placeholder={item.physicalCount !== null && item.physicalCount !== undefined ? String(item.physicalCount) : "Count"}
                                value={currentPhysical}
                                onChange={(e) => setPhysicalDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSavePhysicalCheck(item.id, currentPhysical);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSavePhysicalCheck(item.id, currentPhysical)}
                                disabled={updatePhysicalCheck.isPending}
                                title="Save physical check count"
                                className="rounded p-1 text-slate-400 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                              >
                                <IconCheck size={14} />
                              </button>
                              {(() => {
                                if (!currentPhysical && currentPhysical !== "0") return null;
                                const pNum = Number(currentPhysical);
                                if (isNaN(pNum)) return null;
                                const target = isPortioned ? item.stock : item.stock + item.counterStock;
                                const variance = pNum - target;
                                if (variance === 0) {
                                  return (
                                    <span
                                      className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200"
                                      title="Physical count matches system stock"
                                    >
                                      ✓ Match
                                    </span>
                                  );
                                }
                                if (variance < 0) {
                                  return (
                                    <span
                                      className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200"
                                      title={`Shortage: physical count is ${Math.abs(variance)} below system`}
                                    >
                                      {variance}
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200"
                                    title={`Surplus: physical count is ${variance} above system`}
                                  >
                                    +{variance}
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <div className="text-center tabular-nums text-xs text-slate-600 font-medium">
                              {item.physicalCount !== null && item.physicalCount !== undefined ? (
                                <span className="font-semibold text-slate-800">{item.physicalCount}</span>
                              ) : (
                                "—"
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3"><StockStatusBadge status={stockStatus(item, threshold)} /></td>
                        <td className="px-4 py-3"><ActiveBadge active={item.isActive} /></td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
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
                    );
                  })}
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
        className="inline-flex items-center gap-1 font-semibold text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      >
        <span>{children}</span>
        <span className={active ? "text-[var(--brand)]" : "opacity-40"} aria-hidden="true">
          <IconSort size={13} />
        </span>
      </button>
    </th>
  );
}

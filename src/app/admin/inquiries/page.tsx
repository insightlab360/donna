"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { InquiryDetailDrawer } from "@/components/admin/InquiryDetailDrawer";
import { Pagination } from "@/components/admin/Pagination";
import { usePagination } from "@/lib/usePagination";
import { INQUIRY_CATEGORIES, INQUIRY_STATUSES, type InquiryCategory, type InquiryStatus, type Profile, type SupportInquiry } from "@/lib/types";

const PAGE_SIZE = 15;
// Safety cap for the current member-base scale — once inquiries/profiles regularly
// approach this, replace the client-side search/filter with a server-paginated query.
const LIST_FETCH_LIMIT = 1000;

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<InquiryCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<InquiryStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [{ data: inq }, { data: p }] = await Promise.all([
      supabase.from("support_inquiries").select("*").order("created_at", { ascending: false }).limit(LIST_FETCH_LIMIT),
      supabase.from("profiles").select("id,name,email").limit(LIST_FETCH_LIMIT),
    ]);
    setInquiries((inq as SupportInquiry[]) ?? []);
    setProfiles((p as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inquiries.filter((i) => {
      if (categoryFilter !== "all" && i.category !== categoryFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (!q) return true;
      const p = profileById.get(i.user_id);
      return (p?.name ?? "").toLowerCase().includes(q) || (p?.email ?? "").toLowerCase().includes(q);
    });
  }, [inquiries, profileById, search, categoryFilter, statusFilter]);

  const selected = inquiries.find((i) => i.id === selectedId) ?? null;
  const { page, pageCount, paged, setPage, totalCount } = usePagination(filtered, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="mb-6 text-xl font-semibold text-black">문의관리</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="이름 또는 Gmail 검색"
          className="w-full max-w-xs rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-black"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value as InquiryCategory | "all");
            setPage(1);
          }}
          className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs"
        >
          <option value="all">전체 유형</option>
          {INQUIRY_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as InquiryStatus | "all");
            setPage(1);
          }}
          className="rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs"
        >
          <option value="all">전체 상태</option>
          {INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-neutral-400">불러오는 중...</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {filtered.length === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-400">문의가 없습니다.</p>
          ) : (
            paged.map((i) => {
              const p = profileById.get(i.user_id);
              return (
                <div
                  key={i.id}
                  onClick={() => setSelectedId(i.id)}
                  className="flex w-full cursor-pointer flex-col gap-2 border-b border-neutral-100 px-4 py-3 text-left last:border-b-0 hover:bg-neutral-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500">
                      <span className="max-w-[45%] truncate">{p?.name ?? "-"}</span>
                      <span className="max-w-[55%] truncate">{p?.email ?? "-"}</span>
                      <span className="shrink-0 rounded border border-neutral-300 px-1.5 py-0.5">{i.category}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-black">{i.subject}</p>
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-2 text-xs text-neutral-400 sm:justify-end sm:text-right">
                    <p>{new Date(i.created_at).toLocaleDateString("ko-KR")}</p>
                    <select
                      value={i.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={async (e) => {
                        const status = e.target.value as InquiryStatus;
                        await fetch(`/api/admin/inquiries/${i.id}/status`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ status }),
                        });
                        load();
                      }}
                      className="rounded border border-neutral-300 px-1.5 py-1 text-[11px] text-neutral-600 outline-none focus:border-black"
                    >
                      {INQUIRY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
          <Pagination page={page} pageCount={pageCount} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      <InquiryDetailDrawer
        inquiry={selected}
        profile={selected ? profileById.get(selected.user_id) : undefined}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onReplied={load}
      />
    </div>
  );
}

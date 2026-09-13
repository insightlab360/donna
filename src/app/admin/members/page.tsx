"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MEMBER_FILTERS, matchesFilter, type MemberFilter } from "@/lib/membership/labels";
import { MemberCard } from "@/components/admin/MemberCard";
import { MemberDetailDrawer } from "@/components/admin/MemberDetailDrawer";
import { MemberRow } from "@/components/admin/MemberRow";
import { Pagination } from "@/components/admin/Pagination";
import { usePagination } from "@/lib/usePagination";
import type { MemberNote, PaymentRecord, Profile } from "@/lib/types";

const PAGE_SIZE = 15;
// Safety cap for the current member-base scale — once members/payments regularly
// approach this, replace the client-side search/filter with a server-paginated query.
const LIST_FETCH_LIMIT = 1000;

export default function AdminMembersPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [{ data: p }, { data: pay }, { data: n }] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(LIST_FETCH_LIMIT),
      supabase
        .from("payment_history")
        .select("id,user_id,is_trial,months,payment_status,paid_amount,refunded_amount,created_at")
        .order("created_at", { ascending: false })
        .limit(LIST_FETCH_LIMIT),
      supabase.from("member_notes").select("user_id,memo1").limit(LIST_FETCH_LIMIT),
    ]);
    setProfiles((p as Profile[]) ?? []);
    setPayments((pay as PaymentRecord[]) ?? []);
    setNotes((n as MemberNote[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  const latestPaymentByUser = useMemo(() => {
    const map = new Map<string, PaymentRecord>();
    for (const p of payments) {
      if (!map.has(p.user_id)) map.set(p.user_id, p);
    }
    return map;
  }, [payments]);

  const memo1ByUser = useMemo(() => new Map(notes.map((n) => [n.user_id, n.memo1 ?? ""])), [notes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return profiles.filter((p) => {
      const latest = latestPaymentByUser.get(p.id);
      if (!matchesFilter(p, latest, filter)) return false;
      if (!q) return true;
      return (p.name ?? "").toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    });
  }, [profiles, latestPaymentByUser, filter, search]);

  const selected = profiles.find((p) => p.id === selectedId) ?? null;
  const { page, pageCount, paged, setPage, totalCount } = usePagination(filtered, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="mb-6 text-xl font-semibold text-black">회원관리</h1>

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
        <div className="flex flex-wrap gap-1.5">
          {MEMBER_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={
                "rounded-full border px-3 py-1 text-xs font-medium " +
                (filter === f.key ? "border-black bg-black text-white" : "border-neutral-300 text-neutral-600 hover:bg-neutral-50")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="py-16 text-center text-sm text-neutral-400">불러오는 중...</p>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          {/* Desktop: full table. A 1080px-wide table can't reflow to a phone screen, so mobile gets a stacked card layout instead. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">이름</th>
                  <th className="px-3 py-2 font-medium">Gmail</th>
                  <th className="px-3 py-2 font-medium">회원종류</th>
                  <th className="px-3 py-2 font-medium">상태</th>
                  <th className="px-3 py-2 font-medium">이용유형</th>
                  <th className="px-3 py-2 font-medium">시작일</th>
                  <th className="px-3 py-2 font-medium">종료일</th>
                  <th className="px-3 py-2 font-medium">남은기간</th>
                  <th className="px-3 py-2 font-medium">결제상태</th>
                  <th className="px-3 py-2 font-medium">최근결제금액</th>
                  <th className="px-3 py-2 font-medium">메모1</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((p) => (
                  <MemberRow
                    key={p.id}
                    profile={p}
                    latestPayment={latestPaymentByUser.get(p.id)}
                    memo1={memo1ByUser.get(p.id) ?? ""}
                    onOpenDetail={() => setSelectedId(p.id)}
                    onChanged={load}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-sm text-neutral-400">
                      조건에 맞는 회원이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="sm:hidden">
            {filtered.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-neutral-400">조건에 맞는 회원이 없습니다.</p>
            ) : (
              paged.map((p) => (
                <MemberCard
                  key={p.id}
                  profile={p}
                  latestPayment={latestPaymentByUser.get(p.id)}
                  memo1={memo1ByUser.get(p.id) ?? ""}
                  onOpenDetail={() => setSelectedId(p.id)}
                  onChanged={load}
                />
              ))
            )}
          </div>

          <Pagination page={page} pageCount={pageCount} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>
      )}

      <MemberDetailDrawer
        profile={selected}
        payments={selected ? payments.filter((pay) => pay.user_id === selected.id) : []}
        onOpenChange={(open) => !open && setSelectedId(null)}
        onChanged={load}
      />
    </div>
  );
}

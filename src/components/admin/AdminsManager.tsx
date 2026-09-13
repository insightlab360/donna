"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import type { Profile, Role } from "@/lib/types";

// Only the columns this screen renders — never the full profiles row.
const ADMIN_COLUMNS = "id,email,name,role,created_at";

export function AdminsManager({ currentUserId }: { currentUserId: string }) {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadAdmins() {
    const supabase = createClient();
    // Server-side filtered to admin/super_admin rows — the whole user base is
    // never loaded into the browser just to find the handful of admins.
    const { data } = await supabase
      .from("profiles")
      .select(ADMIN_COLUMNS)
      .in("role", ["admin", "super_admin"])
      .order("created_at", { ascending: true });
    setAdmins((data as Profile[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    loadAdmins();
  }, []);

  // Debounced server-side search (max 8 rows) instead of preloading every user to filter client-side.
  useEffect(() => {
    const q = search.trim().replace(/[,()%*]/g, "");
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing local results to match the now-empty search box, not a cascading update
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select(ADMIN_COLUMNS)
        .eq("role", "user")
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(8);
      if (!cancelled) setSearchResults((data as Profile[]) ?? []);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  async function changeRole(userId: string, role: Role) {
    setBusyId(userId);
    setError(null);
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "변경에 실패했습니다");
      setSearch("");
      await loadAdmins();
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경에 실패했습니다");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="mb-6 text-xl font-semibold text-black">관리자 관리</h1>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">현재 관리자</h2>
        {loading ? (
          <p className="py-6 text-center text-sm text-neutral-400">불러오는 중...</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {admins.map((a) => (
              <div key={a.id} className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 last:border-b-0">
                <div>
                  <p className="text-sm font-medium text-black">{a.name ?? a.email}</p>
                  <p className="text-xs text-neutral-500">
                    {a.email} · {a.role}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {a.role === "admin" && (
                    <Button size="sm" variant="secondary" disabled={busyId === a.id} onClick={() => changeRole(a.id, "super_admin")}>
                      super_admin으로
                    </Button>
                  )}
                  {a.role === "super_admin" && a.id !== currentUserId && (
                    <Button size="sm" variant="secondary" disabled={busyId === a.id} onClick={() => changeRole(a.id, "admin")}>
                      admin으로
                    </Button>
                  )}
                  <Button size="sm" variant="danger" disabled={busyId === a.id || a.id === currentUserId} onClick={() => changeRole(a.id, "user")}>
                    권한 해제
                  </Button>
                </div>
              </div>
            ))}
            {admins.length === 0 && <p className="py-6 text-center text-sm text-neutral-400">등록된 관리자가 없습니다.</p>}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-neutral-600">관리자로 추가</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 Gmail로 사용자 검색"
          className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-black"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {searchResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-neutral-100 px-4 py-2.5 last:border-b-0">
                <div>
                  <p className="text-sm text-black">{p.name ?? p.email}</p>
                  <p className="text-xs text-neutral-500">{p.email}</p>
                </div>
                <Button size="sm" variant="primary" disabled={busyId === p.id} onClick={() => changeRole(p.id, "admin")}>
                  admin으로 추가
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

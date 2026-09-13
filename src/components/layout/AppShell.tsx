"use client";

import Link from "next/link";
import { DataProvider } from "@/lib/data-context";
import { TodayPopupProvider } from "@/components/today/TodayPopupProvider";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { PullToRefresh } from "./PullToRefresh";
import { periodRangeLabel, roleLabel } from "@/lib/membership/labels";
import type { Profile } from "@/lib/types";

export function AppShell({ email, profile, children }: { email: string; profile: Profile | null; children: React.ReactNode }) {
  const role = profile?.role ?? "user";
  const isAdmin = role === "admin" || role === "super_admin";
  const accountSummary = profile ? `${roleLabel(role)} · ${periodRangeLabel(profile)}` : null;

  return (
    <DataProvider>
      <TodayPopupProvider>
        <div className="flex min-h-screen bg-neutral-50">
          <Sidebar email={email} accountSummary={accountSummary} isAdmin={isAdmin} />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:hidden">
              <Link href="/" className="text-sm font-semibold tracking-tight text-black">
                My Assistant Donna
              </Link>
              <div className="text-right">
                <p className="truncate text-xs text-neutral-400">{email}</p>
                {accountSummary && <p className="text-[11px] text-neutral-400">{accountSummary}</p>}
              </div>
            </header>
            <main className="min-w-0 flex-1 pb-16 sm:pb-0">
              <PullToRefresh>{children}</PullToRefresh>
            </main>
          </div>
          <MobileNav isAdmin={isAdmin} />
        </div>
      </TodayPopupProvider>
    </DataProvider>
  );
}

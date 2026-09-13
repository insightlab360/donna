"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderKanban, ListChecks, ShieldCheck, Settings, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/", label: "오늘", icon: Sun },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/tasks", label: "Task", icon: ListChecks },
  { href: "/projects", label: "프로젝트", icon: FolderKanban },
];

export function Sidebar({
  email,
  accountSummary,
  isAdmin,
}: {
  email: string;
  accountSummary: string | null;
  isAdmin: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden sm:flex sm:w-56 sm:shrink-0 sm:flex-col sm:border-r sm:border-neutral-200 sm:bg-white">
      <Link href="/" className="block px-5 py-6">
        <p className="text-base font-semibold tracking-tight text-black">My Assistant Donna</p>
        <p className="text-xs text-neutral-500">나의 비서 도나</p>
      </Link>

      <nav className="flex-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "mb-1 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
              )}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-neutral-200 px-3 py-4">
        <p className={cn("truncate px-2.5 text-xs text-neutral-500", accountSummary ? "" : "pb-2")}>{email}</p>
        {accountSummary && <p className="px-2.5 pb-2 text-[11px] text-neutral-400">{accountSummary}</p>}
        {isAdmin && (
          <Link
            href="/admin"
            className="mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-black"
          >
            <ShieldCheck size={16} />
            관리자
          </Link>
        )}
        <Link
          href="/settings"
          className={cn(
            "mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
            pathname === "/settings" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-100 hover:text-black"
          )}
        >
          <Settings size={16} />
          설정
        </Link>
        <LogoutButton />
      </div>
    </aside>
  );
}

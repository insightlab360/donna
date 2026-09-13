"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, FolderKanban, ListChecks, ShieldCheck, Settings, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "오늘", icon: Sun },
  { href: "/calendar", label: "캘린더", icon: CalendarDays },
  { href: "/tasks", label: "할 일", icon: ListChecks },
  { href: "/projects", label: "프로젝트", icon: FolderKanban },
  { href: "/settings", label: "설정", icon: Settings },
];

const ADMIN_ITEM = { href: "/admin", label: "관리자", icon: ShieldCheck };

export function MobileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_ITEM] : NAV_ITEMS;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white sm:hidden">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium",
              active ? "text-black" : "text-neutral-400"
            )}
          >
            <Icon size={19} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

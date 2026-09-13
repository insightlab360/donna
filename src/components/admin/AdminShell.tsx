"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Inbox, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/layout/LogoutButton";

export function AdminShell({ isSuperAdmin, children }: { isSuperAdmin: boolean; children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/members", label: "회원관리", icon: Users },
    { href: "/admin/inquiries", label: "문의관리", icon: Inbox },
    ...(isSuperAdmin ? [{ href: "/admin/admins", label: "관리자 관리", icon: ShieldCheck }] : []),
  ];

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-neutral-200 bg-white sm:flex">
        <div className="px-5 py-6">
          <p className="text-base font-semibold tracking-tight text-black">My Assistant Donna</p>
          <p className="text-xs text-neutral-500">관리자 콘솔</p>
        </div>
        <nav className="flex-1 px-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
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
          <Link href="/" className="mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-black">
            <ArrowLeft size={16} />
            앱으로 돌아가기
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:hidden">
          <p className="text-sm font-semibold tracking-tight text-black">My Assistant Donna</p>
          <Link href="/" className="text-xs text-neutral-500">
            앱으로
          </Link>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 bg-white px-3 py-2 sm:hidden">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium",
                  active ? "bg-black text-white" : "text-neutral-600"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}

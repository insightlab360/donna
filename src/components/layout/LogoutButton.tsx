"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-black disabled:opacity-50",
        className
      )}
    >
      <LogOut size={16} />
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}

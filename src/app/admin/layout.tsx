import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";
import type { Profile } from "@/lib/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase.from("profiles").select("id, role").eq("id", user.id).maybeSingle();
  const profile = profileRow as Profile | null;
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    redirect("/");
  }

  return <AdminShell isSuperAdmin={profile.role === "super_admin"}>{children}</AdminShell>;
}

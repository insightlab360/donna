import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminsManager } from "@/components/admin/AdminsManager";
import type { Profile } from "@/lib/types";

export default async function AdminAdminsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = profileRow as Profile | null;
  if (!profile || profile.role !== "super_admin") {
    redirect("/admin/members");
  }

  return <AdminsManager currentUserId={user.id} />;
}

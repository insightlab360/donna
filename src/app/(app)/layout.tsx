import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { ApplyScreen } from "@/components/membership/ApplyScreen";
import { MembershipStatusScreen } from "@/components/membership/MembershipStatusScreen";
import { effectiveStatus } from "@/lib/membership/period";
import type { Profile } from "@/lib/types";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const profile = profileRow as Profile | null;
  const isAdmin = profile?.role === "admin" || profile?.role === "super_admin";

  if (!isAdmin) {
    if (!profile || profile.membership_status === null) {
      return <ApplyScreen />;
    }
    const status = effectiveStatus(profile);
    if (status === "pending" || status === "suspended" || status === "expired") {
      return <MembershipStatusScreen status={status} />;
    }
  }

  return (
    <AppShell email={user.email ?? ""} profile={profile}>
      {children}
    </AppShell>
  );
}

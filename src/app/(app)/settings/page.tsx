import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { MyMembershipCard } from "@/components/membership/MyMembershipCard";
import { InquiryButton } from "@/components/support/InquiryButton";
import type { Profile } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("membership_status, unlimited, access_start_at, access_end_at, trial_used")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRow as Profile | null;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="mb-6 text-xl font-semibold text-black">설정</h1>

      <section className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-black">계정</h2>
        <p className="text-sm text-neutral-600">{user.email}</p>
        <p className="mt-1 text-xs text-neutral-400">Google 계정으로 로그인되어 있습니다.</p>
      </section>

      {profile && <MyMembershipCard profile={profile} />}

      <section className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-black">알림</h2>
        <p className="text-sm text-neutral-600">
          평일(월–금) 오전 8:30에 {user.email}로 오늘의 Task를 이메일로 보내드립니다.
        </p>
        <p className="mt-1 text-xs text-neutral-400">오늘 Task가 없는 날에는 메일이 발송되지 않습니다. 이용 중인 회원에게만 발송됩니다.</p>
      </section>

      <section className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-black">문의</h2>
        <p className="mb-3 text-sm text-neutral-600">이용신청, 결제, 이용기간 등 궁금한 점을 관리자에게 문의할 수 있습니다.</p>
        <InquiryButton />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold text-black">계정 관리</h2>
        <LogoutButton className="border border-neutral-300" />
      </section>
    </div>
  );
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const SAFE_COLUMNS =
  "id,is_trial,months,payment_method,bank_name,depositor_name,paid_at,expected_amount,paid_amount,refunded_amount,payment_status,confirmed_at,created_at,updated_at";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  // payment_history is admin-only under RLS (it holds internal memo/confirmed_by
  // columns), so the owning user's sanitized view is served here instead.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payment_history")
    .select(SAFE_COLUMNS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ payments: data ?? [] });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/api-error";
import { applyForMembership } from "@/lib/membership/actions";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

    const admin = createAdminClient();
    const profile = await applyForMembership(admin, user.id);
    return NextResponse.json({ profile });
  } catch (err) {
    return handleApiError(err);
  }
}

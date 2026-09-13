import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** The signed-in user's own profile, or null if not logged in. Row creation is trigger-based, so it should always exist post-login. */
export async function getCurrentProfile(): Promise<{ user: User; profile: Profile | null } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { user, profile: (profile as Profile) ?? null };
}

/** Throws unless the caller is signed in with role admin/super_admin. Use in every /api/admin/* route. */
export async function requireAdmin(): Promise<{ user: User; profile: Profile }> {
  const result = await getCurrentProfile();
  if (!result) throw new UnauthorizedError("로그인이 필요합니다");
  if (!result.profile || (result.profile.role !== "admin" && result.profile.role !== "super_admin")) {
    throw new ForbiddenError("관리자 권한이 필요합니다");
  }
  return { user: result.user, profile: result.profile };
}

/** Throws unless the caller is signed in with role super_admin. Use for admin-management endpoints. */
export async function requireSuperAdmin(): Promise<{ user: User; profile: Profile }> {
  const result = await getCurrentProfile();
  if (!result) throw new UnauthorizedError("로그인이 필요합니다");
  if (!result.profile || result.profile.role !== "super_admin") {
    throw new ForbiddenError("super_admin 권한이 필요합니다");
  }
  return { user: result.user, profile: result.profile };
}

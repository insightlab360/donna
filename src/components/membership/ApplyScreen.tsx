"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/layout/LogoutButton";

export function ApplyScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/membership/apply", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "이용신청에 실패했습니다");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "이용신청에 실패했습니다");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold tracking-tight text-black">My Assistant Donna</p>
        <p className="mt-1 text-sm text-neutral-500">나의 비서 도나</p>
        <p className="mt-6 text-sm text-neutral-600">
          My Assistant Donna는 승인된 회원만 이용할 수 있습니다.
          <br />
          이용신청 후 관리자 승인을 기다려주세요.
        </p>

        <Button variant="primary" className="mt-8 w-full" onClick={handleApply} disabled={submitting}>
          {submitting ? "신청 중..." : "이용신청하기"}
        </Button>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <LogoutButton className="mx-auto mt-4 justify-center" />
      </div>
    </div>
  );
}

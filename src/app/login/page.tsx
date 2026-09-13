"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold tracking-tight text-black">My Assistant Donna</p>
        <p className="mt-1 text-sm text-neutral-500">나의 비서 도나</p>
        <p className="mt-6 text-sm text-neutral-600">
          개인 일정, 회사 업무, 프로젝트를
          <br />
          한곳에서 관리하세요.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
        >
          <LogIn size={17} />
          {loading ? "이동 중..." : "Google로 로그인"}
        </button>

        {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

        <p className="mt-6 text-xs text-neutral-400">Google 계정으로만 로그인할 수 있습니다.</p>
      </div>
    </div>
  );
}

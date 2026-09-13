"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { InquiryModal } from "@/components/support/InquiryModal";

const MESSAGES: Record<"pending" | "suspended" | "expired", { title: string; body: string }> = {
  pending: { title: "승인 대기중입니다", body: "이용신청이 접수되었습니다. 관리자 승인 후 이용하실 수 있습니다." },
  suspended: { title: "이용중지 처리되었습니다", body: "이용중지 처리되었습니다. 관리자에게 연락하세요." },
  expired: { title: "이용기간이 종료되었습니다", body: "이용기간이 종료되었습니다. 관리자에게 연락하세요." },
};

export function MembershipStatusScreen({ status }: { status: "pending" | "suspended" | "expired" }) {
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const { title, body } = MESSAGES[status];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <p className="text-2xl font-semibold tracking-tight text-black">My Assistant Donna</p>
        <p className="mt-1 text-sm text-neutral-500">나의 비서 도나</p>

        <p className="mt-6 text-sm font-medium text-black">{title}</p>
        <p className="mt-1 text-sm text-neutral-600">{body}</p>

        <Button variant="primary" className="mt-8 w-full" onClick={() => setInquiryOpen(true)}>
          관리자에게 문의하기
        </Button>

        <LogoutButton className="mx-auto mt-4 justify-center" />
      </div>

      <InquiryModal open={inquiryOpen} onOpenChange={setInquiryOpen} />
    </div>
  );
}

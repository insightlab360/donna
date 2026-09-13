"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import type { Profile, SupportInquiry } from "@/lib/types";

interface InquiryDetailDrawerProps {
  inquiry: SupportInquiry | null;
  profile: Profile | undefined;
  onOpenChange: (open: boolean) => void;
  onReplied: () => void;
}

export function InquiryDetailDrawer({ inquiry, profile, onOpenChange, onReplied }: InquiryDetailDrawerProps) {
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!inquiry) return null;

  async function handleReply() {
    if (!inquiry) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/inquiries/${inquiry.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "답변 등록에 실패했습니다");
      setReply("");
      onReplied();
    } catch (err) {
      setError(err instanceof Error ? err.message : "답변 등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer open={!!inquiry} onOpenChange={onOpenChange} title={inquiry.subject} subtitle={`${profile?.name ?? "-"} · ${profile?.email ?? "-"}`}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="rounded border border-neutral-300 px-1.5 py-0.5">{inquiry.category}</span>
          <span>{inquiry.status}</span>
          <span>{new Date(inquiry.created_at).toLocaleString("ko-KR")}</span>
        </div>

        <div className="rounded-md bg-neutral-50 p-3">
          <p className="whitespace-pre-wrap text-sm text-black">{inquiry.message}</p>
        </div>

        {inquiry.admin_reply ? (
          <div className="rounded-md border border-neutral-200 p-3">
            <p className="mb-1 text-xs font-semibold text-neutral-600">답변 완료</p>
            <p className="whitespace-pre-wrap text-sm text-black">{inquiry.admin_reply}</p>
            <p className="mt-1 text-xs text-neutral-400">{inquiry.replied_at ? new Date(inquiry.replied_at).toLocaleString("ko-KR") : ""}</p>
          </div>
        ) : (
          <div>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-600">답변 작성</span>
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                placeholder="답변 내용을 입력하세요"
                className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
              />
            </label>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <div className="mt-2 flex justify-end">
              <Button size="sm" variant="primary" disabled={submitting || !reply.trim()} onClick={handleReply}>
                {submitting ? "발송 중..." : "답변 등록 및 메일 발송"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

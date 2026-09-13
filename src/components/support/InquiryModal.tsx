"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { INQUIRY_CATEGORIES, type InquiryCategory } from "@/lib/types";

export function InquiryModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [category, setCategory] = useState<InquiryCategory>("기타");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "문의 등록에 실패했습니다");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "문의 등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose(open: boolean) {
    onOpenChange(open);
    if (!open) {
      setTimeout(() => {
        setCategory("기타");
        setSubject("");
        setMessage("");
        setError(null);
        setDone(false);
      }, 200);
    }
  }

  return (
    <Modal open={open} onOpenChange={handleClose} title="관리자에게 문의하기">
      {done ? (
        <div className="py-6 text-center">
          <p className="text-sm text-black">문의가 접수되었습니다.</p>
          <p className="mt-1 text-xs text-neutral-500">답변은 등록하신 이메일로 안내드립니다.</p>
          <Button variant="primary" size="sm" className="mt-4" onClick={() => handleClose(false)}>
            닫기
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">문의유형</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as InquiryCategory)}
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
            >
              {INQUIRY_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">제목</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-600">문의내용</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              placeholder="문의하실 내용을 입력하세요"
              className="w-full resize-none rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => handleClose(false)} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={submitting}>
              {submitting ? "등록 중..." : "문의 등록"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

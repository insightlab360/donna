"use client";

import { useEffect, useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { formatMonthDayKR } from "@/lib/date";
import { formatKRW } from "@/lib/membership/config";
import { effectiveStatus, remainingLabel } from "@/lib/membership/period";
import { membershipActionLabel, paymentStatusLabel, statusLabel } from "@/lib/membership/labels";
import type { MemberNote, MemberPaymentNote, MembershipHistoryEntry, PaymentRecord, Profile } from "@/lib/types";
import { ApproveForm } from "./forms/ApproveForm";
import { ExtendForm } from "./forms/ExtendForm";
import { ChangePeriodForm } from "./forms/ChangePeriodForm";
import { UnlimitedRevokeForm } from "./forms/UnlimitedRevokeForm";
import { RefundForm } from "./forms/RefundForm";

type Mode = "overview" | "approve" | "extend" | "change-period" | "unlimited-revoke" | { refund: PaymentRecord };

interface MemberDetailDrawerProps {
  profile: Profile | null;
  payments: PaymentRecord[];
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export function MemberDetailDrawer({ profile, payments, onOpenChange, onChanged }: MemberDetailDrawerProps) {
  const [mode, setMode] = useState<Mode>("overview");
  const [history, setHistory] = useState<MembershipHistoryEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [memo1, setMemo1] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const [paymentNotes, setPaymentNotes] = useState<MemberPaymentNote[]>([]);
  const [newPaymentNote, setNewPaymentNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets local UI state when the selected member changes
    setMode("overview");
    setError(null);
    setMemo1("");
    setNoteSaved(false);
    setNewPaymentNote("");
    if (!profile) return;
    const supabase = createClient();
    supabase
      .from("membership_history")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setHistory((data as MembershipHistoryEntry[]) ?? []));
    supabase
      .from("member_notes")
      .select("*")
      .eq("user_id", profile.id)
      .maybeSingle()
      .then(({ data }) => {
        const note = data as MemberNote | null;
        setMemo1(note?.memo1 ?? "");
      });
    supabase
      .from("member_payment_notes")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setPaymentNotes((data as MemberPaymentNote[]) ?? []));
  }, [profile]);

  async function handleSaveNote() {
    if (!profile) return;
    setNoteSaving(true);
    setNoteSaved(false);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${profile.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo1 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "메모 저장에 실패했습니다");
      setNoteSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "메모 저장에 실패했습니다");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleAddPaymentNote() {
    if (!profile || !newPaymentNote.trim()) return;
    setAddingNote(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/members/${profile.id}/payment-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPaymentNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "결제내역 메모 추가에 실패했습니다");
      setPaymentNotes((prev) => [data.note as MemberPaymentNote, ...prev]);
      setNewPaymentNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "결제내역 메모 추가에 실패했습니다");
    } finally {
      setAddingNote(false);
    }
  }

  if (!profile) return null;

  const status = effectiveStatus(profile);

  async function call(path: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "요청에 실패했습니다");
      onChanged();
      setMode("overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청에 실패했습니다");
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspendToggle() {
    if (!profile) return;
    const suspending = status === "active";
    if (!window.confirm(suspending ? "이 회원의 이용을 중지할까요?" : "이 회원의 이용을 재개할까요?")) return;
    await call(`/api/admin/members/${profile.id}/${suspending ? "suspend" : "resume"}`);
  }

  async function handleGrantUnlimited() {
    if (!profile) return;
    if (!window.confirm("이 회원을 무제한으로 전환할까요?")) return;
    await call(`/api/admin/members/${profile.id}/unlimited`, { unlimited: true });
  }

  return (
    <Drawer open={!!profile} onOpenChange={onOpenChange} title={profile.name ?? profile.email} subtitle={profile.email}>
      <div className="flex flex-col gap-5">
        <div className="rounded-md border border-neutral-200 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
            <span className="rounded border border-neutral-300 px-1.5 py-0.5 font-medium text-neutral-700">{profile.role}</span>
            <span>{statusLabel(status)}</span>
            {profile.unlimited && <span className="font-medium text-black">무제한</span>}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-neutral-400">시작일</p>
              <p className="text-black">{profile.access_start_at ? formatMonthDayKR(profile.access_start_at) : "-"}</p>
            </div>
            <div>
              <p className="text-neutral-400">종료일</p>
              <p className="text-black">{profile.unlimited ? "-" : profile.access_end_at ? formatMonthDayKR(profile.access_end_at) : "-"}</p>
            </div>
            <div>
              <p className="text-neutral-400">남은기간</p>
              <p className="text-black">{remainingLabel(profile)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 p-3">
          <p className="mb-2 text-xs font-semibold text-neutral-600">관리자 메모1 (본인에게 노출 안 됨, 최대 5자)</p>
          <div className="flex items-center gap-2">
            <input
              value={memo1}
              onChange={(e) => {
                setMemo1(e.target.value.slice(0, 5));
                setNoteSaved(false);
              }}
              maxLength={5}
              className="flex-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
            />
            <Button size="sm" variant="secondary" onClick={handleSaveNote} disabled={noteSaving}>
              {noteSaving ? "저장 중..." : "저장"}
            </Button>
            {noteSaved && <span className="text-xs text-neutral-400">저장됨</span>}
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 p-3">
          <p className="mb-2 text-xs font-semibold text-neutral-600">결제내역 메모 (본인에게 노출 안 됨, 누적 기록)</p>
          <div className="mb-2 flex items-center gap-2">
            <input
              value={newPaymentNote}
              onChange={(e) => setNewPaymentNote(e.target.value.slice(0, 30))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddPaymentNote();
                }
              }}
              maxLength={30}
              placeholder="예: 9/13 3000원 계좌이체 확인"
              className="flex-1 rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm outline-none focus:border-black"
            />
            <Button size="sm" variant="secondary" onClick={handleAddPaymentNote} disabled={addingNote || !newPaymentNote.trim()}>
              추가
            </Button>
          </div>
          {paymentNotes.length === 0 ? (
            <p className="py-2 text-center text-xs text-neutral-400">기록된 결제내역 메모가 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {paymentNotes.map((n) => (
                <div key={n.id} className="text-xs text-neutral-600">
                  <span>{n.content}</span>
                  <span className="ml-1.5 text-neutral-400">{new Date(n.created_at).toLocaleString("ko-KR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {mode === "overview" && (
          <div className="flex flex-wrap gap-1.5">
            {status === "pending" && (
              <Button size="sm" variant="primary" onClick={() => setMode("approve")}>
                승인
              </Button>
            )}
            {(status === "active" || status === "expired") && !profile.unlimited && (
              <Button size="sm" variant="secondary" onClick={() => setMode("extend")}>
                {status === "expired" ? "재승인(연장)" : "연장"}
              </Button>
            )}
            {status === "active" && !profile.unlimited && (
              <Button size="sm" variant="secondary" onClick={() => setMode("change-period")}>
                기간변경
              </Button>
            )}
            {(status === "active" || status === "suspended") && (
              <Button size="sm" variant="secondary" onClick={handleSuspendToggle} disabled={busy}>
                {status === "active" ? "이용중지" : "재개"}
              </Button>
            )}
            {!profile.unlimited && (status === "active" || status === "expired") && (
              <Button size="sm" variant="secondary" onClick={handleGrantUnlimited} disabled={busy}>
                무제한 전환
              </Button>
            )}
            {profile.unlimited && (
              <Button size="sm" variant="secondary" onClick={() => setMode("unlimited-revoke")}>
                무제한 해제
              </Button>
            )}
          </div>
        )}

        {mode === "approve" && (
          <ApproveForm
            trialUsed={profile.trial_used}
            busy={busy}
            onCancel={() => setMode("overview")}
            onSubmit={(payload) => call(`/api/admin/members/${profile.id}/approve`, payload)}
          />
        )}
        {mode === "extend" && (
          <ExtendForm busy={busy} onCancel={() => setMode("overview")} onSubmit={(payload) => call(`/api/admin/members/${profile.id}/extend`, payload)} />
        )}
        {mode === "change-period" && (
          <ChangePeriodForm
            currentStart={profile.access_start_at}
            currentEnd={profile.access_end_at}
            busy={busy}
            onCancel={() => setMode("overview")}
            onSubmit={(payload) => call(`/api/admin/members/${profile.id}/change-period`, payload)}
          />
        )}
        {mode === "unlimited-revoke" && (
          <UnlimitedRevokeForm
            busy={busy}
            onCancel={() => setMode("overview")}
            onSubmit={(payload) => call(`/api/admin/members/${profile.id}/unlimited`, { unlimited: false, ...payload })}
          />
        )}
        {typeof mode === "object" && (
          <RefundForm
            payment={mode.refund}
            busy={busy}
            onCancel={() => setMode("overview")}
            onSubmit={(payload) => call(`/api/admin/payments/${mode.refund.id}/refund`, payload)}
          />
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-600">결제 이력</p>
          {payments.length === 0 ? (
            <p className="py-3 text-center text-xs text-neutral-400">결제 이력이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {payments.map((pay) => (
                <div key={pay.id} className="rounded-md border border-neutral-100 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-black">
                      {pay.is_trial ? "무료체험" : pay.months ? `${pay.months}개월` : "-"}
                    </span>
                    <span className="text-neutral-500">{paymentStatusLabel(pay.payment_status)}</span>
                  </div>
                  <p className="mt-1 text-neutral-500">
                    {pay.paid_amount != null ? formatKRW(pay.paid_amount) : "-"}
                    {pay.refunded_amount > 0 && ` (환불 ${formatKRW(pay.refunded_amount)})`}
                  </p>
                  {!pay.is_trial &&
                    (pay.payment_status === "paid" || pay.payment_status === "partially_refunded") &&
                    pay.paid_amount != null &&
                    pay.refunded_amount < pay.paid_amount && (
                    <button
                      className="mt-1.5 text-neutral-400 underline hover:text-black"
                      onClick={() => setMode({ refund: pay })}
                    >
                      환불/취소
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-neutral-600">이용 이력</p>
          {history.length === 0 ? (
            <p className="py-3 text-center text-xs text-neutral-400">이력이 없습니다.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {history.map((h) => (
                <div key={h.id} className="text-xs text-neutral-500">
                  <span className="font-medium text-neutral-700">{membershipActionLabel(h.action)}</span>
                  {h.note && <span> · {h.note}</span>}
                  <span className="ml-1 text-neutral-400">{new Date(h.created_at).toLocaleString("ko-KR")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}

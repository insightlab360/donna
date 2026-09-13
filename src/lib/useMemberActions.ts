"use client";

import { useState } from "react";

/** Shared "call an admin member-action endpoint, refresh on success" behavior for MemberRow (desktop table) and MemberCard (mobile). */
export function useMemberActions(onChanged: () => void) {
  const [busy, setBusy] = useState(false);

  async function post(path: string, body?: unknown) {
    setBusy(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (res.ok) onChanged();
    } finally {
      setBusy(false);
    }
  }

  return { busy, post };
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useData } from "@/lib/data-context";
import { todayKST } from "@/lib/date";
import { TodayPopup } from "./TodayPopup";

interface TodayPopupContextValue {
  openPopup: () => void;
}

const TodayPopupContext = createContext<TodayPopupContextValue | null>(null);

export function TodayPopupProvider({ children }: { children: React.ReactNode }) {
  const { loading } = useData();
  const [open, setOpen] = useState(false);
  const [autoChecked, setAutoChecked] = useState(false);

  useEffect(() => {
    if (loading || autoChecked) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time gate so this effect body runs only once after load
    setAutoChecked(true);
    try {
      const key = `donna-today-popup-shown-${todayKST()}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, [loading, autoChecked]);

  return (
    <TodayPopupContext.Provider value={{ openPopup: () => setOpen(true) }}>
      {children}
      <TodayPopup open={open} onOpenChange={setOpen} />
    </TodayPopupContext.Provider>
  );
}

export function useTodayPopup() {
  const ctx = useContext(TodayPopupContext);
  if (!ctx) throw new Error("useTodayPopup must be used within a TodayPopupProvider");
  return ctx;
}

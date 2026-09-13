"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useData } from "@/lib/data-context";

const PULL_THRESHOLD = 64;
const MAX_PULL = 90;

/** Touch-driven pull-to-refresh — only activates when already scrolled to the top, doesn't call preventDefault so normal scrolling is untouched. */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const { refresh } = useData();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshingRef.current) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (startY.current === null) return;
      if (window.scrollY > 0) {
        startY.current = null;
        distanceRef.current = 0;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      const distance = delta > 0 ? Math.min(MAX_PULL, delta * 0.5) : 0;
      distanceRef.current = distance;
      setPullDistance(distance);
    }

    async function onTouchEnd() {
      if (startY.current === null) return;
      startY.current = null;
      if (distanceRef.current >= PULL_THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD);
        try {
          await refresh();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullDistance(0);
          distanceRef.current = 0;
        }
      } else {
        setPullDistance(0);
        distanceRef.current = 0;
      }
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [refresh]);

  return (
    <div>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ height: pullDistance, transition: refreshing || pullDistance === 0 ? "height 200ms ease-out" : undefined }}
      >
        <RefreshCw size={18} className={refreshing ? "animate-spin text-neutral-400" : "text-neutral-300"} />
      </div>
      {children}
    </div>
  );
}

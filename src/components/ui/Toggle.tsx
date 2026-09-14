"use client";

import { cn } from "@/lib/utils";

export function Toggle({
  checked,
  onChange,
  activeClassName = "bg-black",
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  /** Track color while on — defaults to black, pass e.g. "bg-red-800" for a colored toggle. */
  activeClassName?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? activeClassName : "bg-neutral-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

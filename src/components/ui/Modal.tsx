"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Modal({ open, onOpenChange, title, subtitle, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-neutral-200 bg-white shadow-xl outline-none">
          <div className="flex items-start justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-black">{title}</Dialog.Title>
              {subtitle && <Dialog.Description className="mt-0.5 text-xs text-neutral-500">{subtitle}</Dialog.Description>}
            </div>
            <Dialog.Close asChild>
              <button aria-label="닫기" className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-black">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>
          <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

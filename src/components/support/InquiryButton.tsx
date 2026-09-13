"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { InquiryModal } from "./InquiryModal";

export function InquiryButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" className="border-neutral-300" onClick={() => setOpen(true)}>
        관리자에게 문의하기
      </Button>
      <InquiryModal open={open} onOpenChange={setOpen} />
    </>
  );
}

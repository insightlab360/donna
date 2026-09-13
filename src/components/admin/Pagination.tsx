"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageCount: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageCount, totalCount, pageSize, onPageChange }: PaginationProps) {
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between border-t border-neutral-200 px-3 py-2.5 text-xs text-neutral-500">
      <span>
        전체 {totalCount}개 중 {start}–{end}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md p-1 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="이전 페이지"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="px-1.5 font-medium text-neutral-700">
          {page} / {pageCount}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className="rounded-md p-1 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="다음 페이지"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

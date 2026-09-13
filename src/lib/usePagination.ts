import { useMemo, useState } from "react";

/** Client-side pagination over an already-fetched, filtered array. Clamps automatically when the array shrinks. */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize]
  );
  return { page: safePage, pageCount, paged, setPage, totalCount: items.length };
}

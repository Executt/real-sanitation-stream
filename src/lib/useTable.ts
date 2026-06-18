import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export function useTable<T>(
  rows: T[],
  opts?: { initialSort?: { key: keyof T; dir: SortDir }; pageSize?: number },
) {
  const [sort, setSort] = useState<{ key: keyof T; dir: SortDir } | null>(opts?.initialSort ?? null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(opts?.pageSize ?? 20);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const { key, dir } = sort;
    const sign = dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = a[key] as unknown;
      const vb = b[key] as unknown;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
      if (typeof va === "boolean" && typeof vb === "boolean") return (Number(va) - Number(vb)) * sign;
      return String(va).localeCompare(String(vb), "pt-BR", { numeric: true, sensitivity: "base" }) * sign;
    });
  }, [rows, sort]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const toggleSort = (key: keyof T) => {
    setPage(1);
    setSort((s) =>
      s && s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  };

  return {
    rows: pageRows,
    allSorted: sorted,
    total,
    page: safePage,
    pageCount,
    pageSize,
    sort,
    setPage,
    setPageSize,
    toggleSort,
    reset: () => setPage(1),
  };
}

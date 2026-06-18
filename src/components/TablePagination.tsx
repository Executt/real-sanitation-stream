import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Props {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  sizes?: number[];
}

export function TablePagination({
  page, pageCount, pageSize, total, onPageChange, onPageSizeChange, sizes = [10, 20, 50, 100],
}: Props) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t bg-muted/30">
      <p className="text-xs text-muted-foreground font-mono">
        {from}–{to} de {total}
      </p>
      <div className="flex items-center gap-2">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Por página:</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="h-7 w-[70px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {sizes.map((s) => <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onPageChange(1)}>
            <ChevronsLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-mono px-2">{page}/{pageCount}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= pageCount} onClick={() => onPageChange(pageCount)}>
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

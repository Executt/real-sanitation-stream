import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Props<K extends string> {
  label: string;
  sortKey: K;
  currentKey: K | null;
  dir: "asc" | "desc" | null;
  onClick: (k: K) => void;
  className?: string;
  align?: "left" | "right";
}

export function SortHeader<K extends string>({
  label, sortKey, currentKey, dir, onClick, className, align = "left",
}: Props<K>) {
  const active = currentKey === sortKey;
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 text-xs uppercase tracking-wide font-medium hover:text-foreground transition-colors",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
        <Icon className="size-3" />
      </button>
    </TableHead>
  );
}

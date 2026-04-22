import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="bg-card p-5 border rounded-lg shadow-sm">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-8 w-32 mb-3" />
      <Skeleton className="h-3 w-40 mb-4" />
      <Skeleton className="h-1.5 w-full rounded-full" />
    </div>
  );
}

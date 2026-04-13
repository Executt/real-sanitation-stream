import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: "default" | "destructive" | "warning" | "success";
  progress?: number;
}

const variantStyles = {
  default: "text-foreground",
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
};

export function StatCard({ label, value, subtitle, variant = "default", progress }: StatCardProps) {
  return (
    <div className="bg-card p-5 border rounded-sm shadow-sm">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-3xl font-semibold mt-2", variantStyles[variant])}>{value}</p>
      {subtitle && (
        <p className={cn("text-xs mt-3", variant === "destructive" ? "text-destructive" : "text-muted-foreground")}>
          {subtitle}
        </p>
      )}
      {progress !== undefined && (
        <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

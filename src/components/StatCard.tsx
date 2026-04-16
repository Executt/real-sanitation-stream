import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: "default" | "destructive" | "warning" | "success";
  progress?: number;
  icon?: LucideIcon;
}

const variantStyles = {
  default: "text-foreground",
  destructive: "text-destructive",
  warning: "text-warning",
  success: "text-success",
};

const variantBg = {
  default: "bg-primary/5",
  destructive: "bg-destructive/5",
  warning: "bg-warning/5",
  success: "bg-success/5",
};

export function StatCard({ label, value, subtitle, variant = "default", progress, icon: Icon }: StatCardProps) {
  return (
    <div className="bg-card p-5 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
          <p className={cn("text-3xl font-semibold mt-2 tracking-tight", variantStyles[variant])}>{value}</p>
        </div>
        {Icon && (
          <div className={cn("size-10 rounded-lg flex items-center justify-center", variantBg[variant])}>
            <Icon className={cn("size-5", variantStyles[variant])} />
          </div>
        )}
      </div>
      {subtitle && (
        <p className={cn("text-xs mt-3", variant === "destructive" ? "text-destructive" : "text-muted-foreground")}>
          {subtitle}
        </p>
      )}
      {progress !== undefined && (
        <div className="mt-4 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

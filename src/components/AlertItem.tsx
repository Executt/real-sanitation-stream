import { cn } from "@/lib/utils";

interface AlertItemProps {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  time?: string;
}

const severityConfig = {
  critical: { label: "CRÍTICO", className: "bg-destructive text-destructive-foreground" },
  warning: { label: "AVISO", className: "bg-warning text-warning-foreground" },
  info: { label: "INFO", className: "bg-primary text-primary-foreground" },
};

export function AlertItem({ title, description, severity, time }: AlertItemProps) {
  const config = severityConfig[severity];
  return (
    <div className="flex justify-between items-start py-3 border-b last:border-b-0">
      <div className="flex-1 mr-3">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        {time && <p className="text-xs text-muted-foreground mt-1">{time}</p>}
      </div>
      <span className={cn("px-2 py-1 text-[10px] font-bold rounded-sm shrink-0", config.className)}>
        {config.label}
      </span>
    </div>
  );
}

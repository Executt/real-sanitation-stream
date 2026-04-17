import { Construction } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Construction className="size-8 text-muted-foreground" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">{title}</h1>
      <p className="text-muted-foreground max-w-md text-sm">
        {description || "Este módulo está em desenvolvimento e será disponibilizado em breve."}
      </p>
    </div>
  );
}

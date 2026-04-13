import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const tipologias = [
  "Lodos Ativados",
  "UASB",
  "UASB + Filtro Biológico",
  "UASB + Lodos Ativados",
  "Lagoa Facultativa",
  "Lagoa Anaeróbia + Lagoa Facultativa",
  "Fossa Séptica + Filtro Anaeróbio",
  "Reator Anaeróbio + Wetland",
  "Outro",
];

const statusOptions = [
  { value: "ativa", label: "Ativa" },
  { value: "construcao", label: "Em Construção" },
  { value: "inativa", label: "Inativa" },
];

export default function CadastroManual() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Cadastro enviado com sucesso",
        description: "Os dados foram submetidos para validação pela ANA.",
      });
      (e.target as HTMLFormElement).reset();
    }, 1500);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Cadastro Manual de Dados</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Formulário para operadores sem integração API — os dados são pré-validados antes do envio à base da ANA
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
        {/* Identificação da ETE */}
        <div className="bg-card border rounded-sm shadow-sm p-6">
          <h2 className="font-semibold mb-4">Identificação da ETE</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigoEte">Código da ETE</Label>
              <Input id="codigoEte" placeholder="ETE-UF-0000" required className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomeEte">Nome da Estação</Label>
              <Input id="nomeEte" placeholder="Ex: ETE Barueri" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="municipio">Município / UF</Label>
              <Input id="municipio" placeholder="Ex: Barueri - SP" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="baciaHidro">Bacia Hidrográfica</Label>
              <Input id="baciaHidro" placeholder="Ex: Bacia do Tietê" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipologia">Tipologia do Processo</Label>
              <Select required>
                <SelectTrigger id="tipologia">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tipologias.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status Operacional</Label>
              <Select required>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Coordenadas */}
        <div className="bg-card border rounded-sm shadow-sm p-6">
          <h2 className="font-semibold mb-4">Localização Geoespacial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" type="number" step="0.000001" placeholder="-23.5121" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" type="number" step="0.000001" placeholder="-46.8756" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="corpoReceptor">Corpo Receptor do Lançamento</Label>
              <Input id="corpoReceptor" placeholder="Ex: Rio Tietê - Trecho Médio" required />
            </div>
          </div>
        </div>

        {/* Dados Operacionais */}
        <div className="bg-card border rounded-sm shadow-sm p-6">
          <h2 className="font-semibold mb-4">Dados Operacionais</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vazaoMedia">Vazão Média (L/s)</Label>
              <Input id="vazaoMedia" type="number" step="0.01" placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dboEntrada">DBO Entrada (mg/L)</Label>
              <Input id="dboEntrada" type="number" step="0.1" placeholder="0.0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dboSaida">DBO Saída (mg/L)</Label>
              <Input id="dboSaida" type="number" step="0.1" placeholder="0.0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eficiencia">Eficiência de Remoção DBO (%)</Label>
              <Input id="eficiencia" type="number" step="0.1" placeholder="0.0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="populacao">População Atendida</Label>
              <Input id="populacao" type="number" placeholder="0" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodoRef">Período de Referência</Label>
              <Input id="periodoRef" type="month" required />
            </div>
          </div>
        </div>

        {/* Dados do Operador */}
        <div className="bg-card border rounded-sm shadow-sm p-6">
          <h2 className="font-semibold mb-4">Identificação do Operador</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nomeOperador">Nome da Concessionária / SAAE</Label>
              <Input id="nomeOperador" placeholder="Ex: SABESP" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input id="cnpj" placeholder="00.000.000/0000-00" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável Técnico</Label>
              <Input id="responsavel" placeholder="Nome completo" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailResp">E-mail do Responsável</Label>
              <Input id="emailResp" type="email" placeholder="tecnico@empresa.gov.br" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" placeholder="Informações adicionais sobre manutenções, paradas, ou desvios operacionais..." rows={3} />
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading} className="px-8">
            {loading ? "Enviando..." : "Submeter Dados para ANA"}
          </Button>
          <Button type="reset" variant="outline">Limpar Formulário</Button>
        </div>
      </form>
    </div>
  );
}

import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Users, Network, Mail, FileCog, Settings2, ShieldCheck, Building2, Gavel, Brain, HardDrive, Database } from "lucide-react";

const modules = [
  {
    title: "Usuários & Roles",
    description: "Gerencie usuários cadastrados e atribua perfis de acesso.",
    url: "/admin/usuarios",
    icon: Users,
  },
  {
    title: "Concessionárias",
    description: "Cadastro nacional de operadores de saneamento e seus vínculos regulatórios.",
    url: "/admin/concessionarias",
    icon: Building2,
  },
  {
    title: "Agências Reguladoras",
    description: "Cadastro das ARs estaduais/municipais e supervisão das concessionárias.",
    url: "/admin/agencias",
    icon: Gavel,
  },
  {
    title: "Configuração LDAP",
    description: "Conecte ao Active Directory para importar usuários corporativos.",
    url: "/admin/ldap",
    icon: Network,
  },
  {
    title: "Configuração SMTP",
    description: "Configure servidor de e-mail para envio de notificações e alertas.",
    url: "/admin/smtp",
    icon: Mail,
  },
  {
    title: "Integração SEI",
    description: "Integração com o Sistema Eletrônico de Informações do governo.",
    url: "/admin/sei",
    icon: FileCog,
  },
  {
    title: "Parâmetros Gerais",
    description: "Configurações globais do sistema, limites e thresholds.",
    url: "/admin/parametros",
    icon: Settings2,
  },
  {
    title: "Modelos Córtex IA",
    description: "Cadastro de modelos treinados, online, pagos e RAG. Governança do Falso Afluente.",
    url: "/admin/cortex-modelos",
    icon: Brain,
  },
  {
    title: "Auditoria & Segurança",
    description: "Visualize logs de auditoria e políticas de segurança.",
    url: "/admin/auditoria",
    icon: ShieldCheck,
  },
];

export default function AdminHub() {
  const { isSuperAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isSuperAdmin) return <Navigate to="/operador" replace />;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Administração</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Central de parametrização e configurações do sistema HydrosNet
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Link
            key={m.url}
            to={m.url}
            className="group bg-card border rounded-sm shadow-sm p-5 hover:border-primary hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-md bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                <m.icon className="size-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">{m.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

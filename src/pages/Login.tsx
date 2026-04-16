import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, LogIn, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupOrg, setSignupOrg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro no login", description: error.message, variant: "destructive" });
    } else {
      navigate("/operador", { replace: true });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { full_name: signupName, organization: signupOrg },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Conta criada", description: "Verifique seu e-mail para confirmar o cadastro." });
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[hsl(224,30%,18%)] flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(220,72%,50%)]/20 to-transparent" />
        <div className="relative z-10 text-center">
          <div className="size-16 bg-[hsl(220,72%,50%)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="size-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">HydrosNet</h1>
          <p className="text-lg text-white/60 mt-3 font-mono">PLATAFORMA INTEGRADA DE SANEAMENTO</p>
          <p className="text-sm text-white/40 mt-6 max-w-md">
            Monitoramento e gestão de Estações de Tratamento de Esgoto com integração ao SNIRH/Atlas Esgotos da ANA
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden flex flex-col items-center gap-2 mb-4">
            <div className="size-12 bg-primary rounded-xl flex items-center justify-center">
              <BarChart3 className="size-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">HydrosNet</h1>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo</h2>
            <p className="text-muted-foreground text-sm mt-1">Entre com suas credenciais para acessar o sistema</p>
          </div>

          <Card className="shadow-lg border-0 bg-card">
            <Tabs defaultValue="login">
              <div className="px-6 pt-6 pb-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="login">
                <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input id="login-email" type="email" placeholder="operador@empresa.com.br" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Senha</Label>
                      <Input id="login-password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      <LogIn className="size-4 mr-2" />
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup}>
                  <CardContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Nome completo</Label>
                      <Input id="signup-name" placeholder="João da Silva" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-org">Organização</Label>
                      <Input id="signup-org" placeholder="SABESP, COPASA, ANA..." value={signupOrg} onChange={(e) => setSignupOrg(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">E-mail</Label>
                      <Input id="signup-email" type="email" placeholder="operador@empresa.com.br" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Senha</Label>
                      <Input id="signup-password" type="password" placeholder="Mínimo 6 caracteres" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={6} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      <UserPlus className="size-4 mr-2" />
                      {loading ? "Cadastrando..." : "Criar conta"}
                    </Button>
                  </CardContent>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          <p className="text-xs text-center text-muted-foreground font-mono">
            v3.0 — Integração SNIRH / Atlas Esgotos / LDAP
          </p>
        </div>
      </div>
    </div>
  );
}

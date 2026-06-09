import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  full_name: string | null;
  organization: string | null;
  position: string | null;
  avatar_url: string | null;
  concessionaria_id: string | null;
  agencia_reguladora_id: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  hasRole: (role: AppRole) => boolean;
  isSuperAdmin: boolean;
  isGestorAna: boolean;
  isGestorAR: boolean;
  isOperador: boolean;
  agenciaReguladoraId: string | null;
  concessionariaId: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const [profileRes, rolesRes] = await Promise.all([
              supabase
                .from("profiles")
                .select("full_name, organization, position, avatar_url, concessionaria_id, agencia_reguladora_id")
                .eq("user_id", session.user.id)
                .single(),
              supabase.from("user_roles").select("role").eq("user_id", session.user.id),
            ]);
            setProfile(profileRes.data);
            setRoles(rolesRes.data?.map((r) => r.role) ?? []);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const hasRole = (role: AppRole) => roles.includes(role);
  const isSuperAdmin = hasRole("superadmin");
  const isGestorAna = hasRole("gestor_ana");
  const isGestorAR = hasRole("gestor_ar");
  const isOperador = hasRole("operador");

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        loading,
        hasRole,
        isSuperAdmin,
        isGestorAna,
        isGestorAR,
        isOperador,
        agenciaReguladoraId: profile?.agencia_reguladora_id ?? null,
        concessionariaId: profile?.concessionaria_id ?? null,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

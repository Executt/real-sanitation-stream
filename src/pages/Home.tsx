import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Página inicial por papel: cada perfil cai direto no painel da sua competência.
 */
export default function Home() {
  const { isSuperAdmin, isGestorAna, isGestorAR } = useAuth();

  if (isSuperAdmin || isGestorAna) return <Navigate to="/command-center" replace />;
  if (isGestorAR) return <Navigate to="/agencia" replace />;
  return <Navigate to="/operador" replace />;
}

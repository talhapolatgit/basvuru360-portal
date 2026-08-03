import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { ReactNode } from "react";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading && !isAuthenticated) {
    return <p className="page page-enter">Yükleniyor…</p>;
  }

  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/giris?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}

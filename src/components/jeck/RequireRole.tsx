import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/hooks/useAuth";

interface Props {
  role: AppRole;
  redirectTo?: string;
  children: ReactNode;
}

export function RequireRole({ role, redirectTo, children }: Props) {
  const { user, role: userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    const target = redirectTo ?? (role === "pro" ? "/pro/auth" : "/auth");
    return <Navigate to={target} state={{ from: location }} replace />;
  }

  if (userRole !== role) {
    // Wrong role — send each user to their home
    return <Navigate to={userRole === "pro" ? "/merchant" : "/"} replace />;
  }

  return <>{children}</>;
}

import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

/**
 * Gates a route behind authentication. While the initial token check is still
 * running we render nothing (rather than flashing the login page and then
 * bouncing back). On failure we redirect to /login, preserving the attempted
 * location so login can send the user back.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return null;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

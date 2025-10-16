import type { JSX } from "react";
import { Navigate } from "react-router-dom";

interface RequireRoleProps {
  children: JSX.Element;
  allowedRoles: Array<"admin" | "user">;
}

const RequireRole = ({ children, allowedRoles }: RequireRoleProps) => {
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : null;
  const role = user?.role as "admin" | "user" | undefined;

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireRole;




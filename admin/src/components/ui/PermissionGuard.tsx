import React from "react";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface PermissionGuardProps {
  module?: string | null;
  requireWrite?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function AccessDeniedCard() {
  return (
    <div className="max-w-md mx-auto mt-16 flex flex-col items-center text-center gap-3">
      <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-500 flex items-center justify-center">
        <ShieldAlert size={26} />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Access denied
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        You don&apos;t have permission to view this section. Contact a superuser
        if you think this is a mistake.
      </p>
    </div>
  );
}

export function PermissionGuard({
  module,
  requireWrite = false,
  fallback,
  children,
}: PermissionGuardProps) {
  const { can, canWrite } = useAuth();

  if (!module) return <>{children}</>;

  const allowed = requireWrite ? canWrite(module) : can(module);
  if (!allowed) {
    return <>{fallback ?? <AccessDeniedCard />}</>;
  }
  return <>{children}</>;
}


import { useLocation } from "react-router-dom";
import { Layers } from "lucide-react";

export function ModulePlaceholderPage() {
  const { pathname } = useLocation();
  const sectionName =
    pathname
      .replace(/^\/cms\/?/, "")
      .split("/")
      .filter(Boolean)
      .map((s) =>
        s
          .split("-")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      )
      .join(" / ") || "Module";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center max-w-2xl mx-auto mt-8 space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-[#4F6EF7]/10 text-[#4F6EF7] flex items-center justify-center mx-auto">
        <Layers size={22} />
      </div>
      <h1 className="text-lg font-bold text-slate-900 dark:text-white">
        {sectionName}
      </h1>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Route <code className="font-mono text-[#4F6EF7]">{pathname}</code> is
        registered in the CMS v2 navigation and guarded by PostgreSQL RBAC.
        Full CRUD handlers & UI for this module arrive in Phase 1–3 after
        Phase 0 sign-off.
      </p>
    </div>
  );
}


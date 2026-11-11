import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Search,
  Trash2,
  ShieldCheck,
  KeyRound,
  History,
  Users as UsersIcon,
} from "lucide-react";
import { adminApi, ApiError, type AdminProfile } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FormModal } from "@/components/ui/FormModal";

const createUserSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  full_name: z.string().min(2),
  password: z.string().min(8),
  access_code: z.string().min(4),
  role_id: z.coerce.number().int().positive(),
  is_superuser: z.boolean(),
  is_active: z.boolean(),
});

type CreateUserValues = z.infer<typeof createUserSchema>;

export function AdminSettingsPage() {
  const location = useLocation();
  const isSellerAudit = location.pathname.includes("seller-audit");
  const { currentUser, refreshProfile } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "users" | "roles" | "audit" | "security"
  >(isSellerAudit ? "audit" : "users");
  const [userSearch, setUserSearch] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditModule, setAuditModule] = useState(isSellerAudit ? "seller" : "");

  useEffect(() => {
    if (isSellerAudit) {
      setActiveTab("audit");
      setAuditModule("seller");
    } else {
      setActiveTab("users");
      setAuditModule("");
    }
  }, [isSellerAudit]);
  const [totpSecret, setTotpSecret] = useState<{
    secret: string;
    otpauth_url: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [curPass, setCurPass] = useState("");
  const [newPass, setNewPass] = useState("");

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["cms-admin-users", userSearch, userPage],
    queryFn: () =>
      adminApi.listUsers({ search: userSearch, page: userPage, limit: 10 }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ["cms-roles"],
    queryFn: () => adminApi.listRoles(),
  });

  const { data: permsData } = useQuery({
    queryKey: ["cms-permissions"],
    queryFn: () => adminApi.listPermissions(),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ["cms-audit", auditModule, auditPage],
    queryFn: () =>
      adminApi.listAuditLogs({
        module: auditModule || undefined,
        page: auditPage,
        limit: 15,
      }),
    enabled: activeTab === "audit",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      is_superuser: false,
      is_active: true,
      role_id: 2,
    },
  });

  const createUserMut = useMutation({
    mutationFn: (v: CreateUserValues) => adminApi.createUser(v),
    onSuccess: () => {
      showToast("Admin user created");
      setCreateOpen(false);
      reset();
      void queryClient.invalidateQueries({ queryKey: ["cms-admin-users"] });
    },
    onError: (err) =>
      showToast(
        err instanceof ApiError ? err.message : "Failed to create user",
        "error"
      ),
  });

  const deleteUserMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteUser(id),
    onSuccess: () => {
      showToast("User deleted");
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["cms-admin-users"] });
    },
    onError: (err) =>
      showToast(
        err instanceof ApiError ? err.message : "Delete failed",
        "error"
      ),
  });

  const togglePermMut = useMutation({
    mutationFn: (arg: {
      roleId: number;
      permissionId: number;
      canRead: boolean;
      canWrite: boolean;
    }) =>
      adminApi.updateRolePermissions(arg.roleId, [
        {
          permission_id: arg.permissionId,
          can_read: arg.canRead,
          can_write: arg.canWrite,
        },
      ]),
    onSuccess: () => {
      showToast("Role permission updated");
      void queryClient.invalidateQueries({ queryKey: ["cms-roles"] });
      void refreshProfile();
    },
    onError: (err) =>
      showToast(
        err instanceof ApiError ? err.message : "Update failed",
        "error"
      ),
  });

  const userColumns: ColumnDef<AdminProfile>[] = [
    {
      key: "username",
      header: "User",
      render: (u) => (
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">
            {u.username}
          </p>
          <p className="text-[11px] text-slate-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
          {u.superuser ? "Super Admin" : u.role_name || u.role_slug}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            u.is_active
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "bg-red-50 text-red-600"
          }`}
        >
          {u.is_active ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      key: "totp",
      header: "2FA",
      render: (u) => (
        <span className="text-[11px] text-slate-500">
          {u.totp_enabled ? "TOTP Enabled" : "Access Code"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (u) =>
        u.id !== currentUser?.id ? (
          <button
            type="button"
            onClick={() => setDeleteTarget(u)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            aria-label={`Delete ${u.username}`}
          >
            <Trash2 size={14} />
          </button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { key: "users" as const, label: "Admin Users", icon: UsersIcon },
          {
            key: "roles" as const,
            label: "Roles & RBAC Matrix",
            icon: ShieldCheck,
          },
          { key: "audit" as const, label: "Audit Logs", icon: History },
          {
            key: "security" as const,
            label: "Password & 2FA TOTP",
            icon: KeyRound,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                active
                  ? "bg-[#4F6EF7] text-white"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={userSearch}
                onChange={(e) => {
                  setUserSearch(e.target.value);
                  setUserPage(1);
                }}
                placeholder="Search admin users..."
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs outline-none focus:border-[#4F6EF7]"
              />
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4F6EF7] hover:bg-[#3d5ae0] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus size={14} /> Add Admin User
            </button>
          </div>

          <DataTable
            columns={userColumns}
            rows={usersData?.items ?? []}
            rowKey={(u) => u.id ?? 0}
            loading={usersLoading}
            page={usersData?.meta?.page ?? 1}
            totalPages={usersData?.meta?.total_pages ?? 1}
            total={usersData?.meta?.total ?? 0}
            onPageChange={setUserPage}
          />
        </div>
      )}

      {/* TAB 2: ROLES & RBAC */}
      {activeTab === "roles" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Module
                </th>
                {(rolesData ?? []).map((r) => (
                  <th
                    key={r.id}
                    className="px-3 py-3 font-semibold text-slate-600 dark:text-slate-300 text-center"
                  >
                    {r.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(permsData ?? []).map((perm) => (
                <tr key={perm.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800 dark:text-white">
                      {perm.label}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {perm.module_key}
                    </p>
                  </td>
                  {(rolesData ?? []).map((role) => {
                    const access = role.permissions?.[perm.module_key || ""];
                    const isSysSuper = role.slug === "super_admin";
                    return (
                      <td key={role.id} className="px-3 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <label className="inline-flex items-center gap-1 text-[10px]">
                            <input
                              type="checkbox"
                              disabled={isSysSuper}
                              checked={isSysSuper || Boolean(access?.read)}
                              onChange={(e) =>
                                togglePermMut.mutate({
                                  roleId: role.id!,
                                  permissionId: perm.id!,
                                  canRead: e.target.checked,
                                  canWrite: e.target.checked
                                    ? Boolean(access?.write)
                                    : false,
                                })
                              }
                            />
                            R
                          </label>
                          <label className="inline-flex items-center gap-1 text-[10px]">
                            <input
                              type="checkbox"
                              disabled={isSysSuper}
                              checked={isSysSuper || Boolean(access?.write)}
                              onChange={(e) =>
                                togglePermMut.mutate({
                                  roleId: role.id!,
                                  permissionId: perm.id!,
                                  canRead:
                                    e.target.checked || Boolean(access?.read),
                                  canWrite: e.target.checked,
                                })
                              }
                            />
                            W
                          </label>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={auditModule}
              onChange={(e) => {
                setAuditModule(e.target.value);
                setAuditPage(1);
              }}
              className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
            >
              <option value="">All modules</option>
              <option value="auth">auth</option>
              <option value="superuser">superuser</option>
              <option value="order">order</option>
              <option value="product">product</option>
            </select>
          </div>

          <DataTable
            columns={[
              {
                key: "time",
                header: "Timestamp",
                render: (a) => (
                  <span className="text-[11px] font-mono text-slate-500">
                    {a.created_at
                      ? new Date(a.created_at).toLocaleString()
                      : "-"}
                  </span>
                ),
              },
              {
                key: "actor",
                header: "Actor",
                render: (a) => (
                  <span className="font-semibold">{a.actor_username}</span>
                ),
              },
              {
                key: "action",
                header: "Action",
                render: (a) => (
                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[11px]">
                    {a.module}.{a.action}
                  </span>
                ),
              },
              {
                key: "entity",
                header: "Entity",
                render: (a) => (
                  <span className="text-[11px]">
                    {a.entity_type} #{a.entity_id}
                  </span>
                ),
              },
              {
                key: "ip",
                header: "IP",
                render: (a) => (
                  <span className="text-[11px] text-slate-400">
                    {a.ip_address}
                  </span>
                ),
              },
            ]}
            rows={auditData?.items ?? []}
            rowKey={(a) => a.id ?? 0}
            loading={auditLoading}
            page={auditData?.meta?.page ?? 1}
            totalPages={auditData?.meta?.total_pages ?? 1}
            total={auditData?.meta?.total ?? 0}
            onPageChange={setAuditPage}
          />
        </div>
      )}

      {/* TAB 4: SECURITY */}
      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold">Change Password</h3>
            <div className="space-y-3">
              <input
                type="password"
                value={curPass}
                onChange={(e) => setCurPass(e.target.value)}
                placeholder="Current password"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs"
              />
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent text-xs"
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await adminApi.changePassword({
                      current_password: curPass,
                      new_password: newPass,
                    });
                    setCurPass("");
                    setNewPass("");
                    showToast("Password updated");
                  } catch (err) {
                    showToast(
                      err instanceof ApiError ? err.message : "Failed",
                      "error"
                    );
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#4F6EF7] text-white text-xs font-semibold cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold">Two-Factor TOTP Setup</h3>
            <p className="text-xs text-slate-500">
              Enable TOTP authenticator codes for the Access Code field during
              login.
            </p>
            {!totpSecret ? (
              <button
                type="button"
                onClick={async () => {
                  const res = await adminApi.setupTOTP();
                  setTotpSecret({
                    secret: res.secret || "",
                    otpauth_url: res.otpauth_url || "",
                  });
                }}
                className="px-4 py-2 rounded-xl bg-violet-700 text-white text-xs font-semibold cursor-pointer"
              >
                Generate TOTP Secret
              </button>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-[11px] font-mono break-all">
                  Secret: {totpSecret.secret}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    placeholder="Enter 6-digit TOTP code"
                    className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await adminApi.enableTOTP(totpCode);
                        showToast("2FA TOTP enabled");
                        setTotpSecret(null);
                        setTotpCode("");
                        void refreshProfile();
                      } catch (err) {
                        showToast(
                          err instanceof ApiError ? err.message : "Invalid OTP",
                          "error"
                        );
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold cursor-pointer"
                  >
                    Verify & Enable
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <FormModal
        open={createOpen}
        title="Add Admin User"
        onClose={() => setCreateOpen(false)}
        maxWidthClass="max-w-md"
      >
        <form
          onSubmit={handleSubmit((v) => createUserMut.mutate(v))}
          className="space-y-3.5"
        >
          <input
            placeholder="Username"
            {...register("username")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          />
          {errors.username && (
            <p className="text-[11px] text-red-500">
              {errors.username.message}
            </p>
          )}
          <input
            placeholder="Email"
            {...register("email")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          />
          <input
            placeholder="Full Name"
            {...register("full_name")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            {...register("password")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          />
          <input
            type="password"
            placeholder="Access Code (min 4 chars)"
            {...register("access_code")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          />
          <select
            {...register("role_id")}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800"
          >
            {(rolesData ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" {...register("is_superuser")} /> Superuser
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || createUserMut.isPending}
              className="px-4 py-2 rounded-xl bg-[#4F6EF7] text-white text-xs font-semibold cursor-pointer"
            >
              Create User
            </button>
          </div>
        </form>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Admin User"
        description={`Disable and remove "${deleteTarget?.username}"? All active sessions will fail authorization immediately.`}
        confirmLabel="Delete"
        loading={deleteUserMut.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget?.id) deleteUserMut.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}


import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ShieldCheck,
  User,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/api/client";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  code: z.string().trim().min(1, "Access code is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath =
    (location.state as { from?: string } | null)?.from || "/cms";

  const [showPassword, setShowPassword] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "", code: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError("");
    try {
      await login(values);
      navigate(fromPath.startsWith("/cms") ? fromPath : "/cms", {
        replace: true,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message);
      } else {
        setServerError("Network error. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[460px_1fr]">
      {/* Desktop Left Dark Editorial Panel (1:1 match with giftlaya.com/cms/login) */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 bg-[#07080d] overflow-hidden">
        <div className="pointer-events-none absolute -top-48 -left-48 w-[560px] h-[560px] rounded-full bg-violet-700/20 blur-[130px]" />
        <div className="pointer-events-none absolute bottom-10 right-0 w-[340px] h-[340px] rounded-full bg-violet-900/25 blur-[100px]" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full bg-violet-600/10 blur-[80px]" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(139,92,246,0.18) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-violet-400 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-600/40 shrink-0">
            <span className="text-white font-bold text-[13px] font-heading">
              GL
            </span>
          </div>
          <span className="text-white/60 font-semibold text-sm tracking-wide">
            Giftlaya
          </span>
          <span className="ml-auto px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/25 text-[10px] font-medium">
            CMS v2
          </span>
        </div>

        <div className="relative z-10 space-y-7">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="text-violet-300 text-xs font-medium">
                Admin Console
              </span>
            </div>
            <h2 className="font-heading text-[42px] font-bold text-white leading-[1.1] tracking-tight">
              Manage
              <br />
              everything
              <br />
              <span className="bg-gradient-to-r from-violet-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
                in one place.
              </span>
            </h2>
            <p className="text-white/30 text-sm mt-4 leading-relaxed max-w-[280px]">
              Events, products, orders, customers — your command centre for all
              of it.
            </p>
          </div>
        </div>

        <p className="relative z-10 text-white/15 text-[11px]">
          © 2025 Giftlaya · Restricted access
        </p>
      </aside>

      {/* Right Column (Mobile Header + Form) */}
      <div className="flex flex-col min-h-screen bg-white">
        {/* Mobile Dark Header */}
        <div className="lg:hidden relative bg-[#07080d] px-6 pt-14 pb-24 overflow-hidden">
          <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-violet-600/25 blur-[70px]" />
          <div className="relative z-10 flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-violet-400 to-violet-700 flex items-center justify-center">
              <span className="text-white font-bold text-xs">GL</span>
            </div>
            <span className="text-white/60 font-semibold text-sm">
              Giftlaya CMS
            </span>
          </div>
          <h1 className="relative z-10 font-heading text-2xl font-bold text-white">
            Welcome back.
          </h1>
          <p className="relative z-10 text-white/35 text-sm mt-1">
            Sign in to your admin account
          </p>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-5 py-8 -mt-10 lg:mt-0 lg:py-0">
          <div className="w-full max-w-[400px]">
            <div className="bg-white rounded-3xl shadow-xl shadow-black/[0.08] lg:shadow-none p-8 lg:p-0 lg:max-w-[360px] lg:mx-auto">
              <div className="hidden lg:block mb-8">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 mb-4">
                  <ShieldCheck size={11} className="text-violet-500" />
                  <span className="text-violet-600 text-[11px] font-semibold">
                    Restricted access
                  </span>
                </span>
                <h1 className="font-heading text-[28px] font-bold text-slate-900 tracking-tight">
                  Sign in
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  Enter your credentials to continue
                </p>
              </div>

              {serverError && (
                <div
                  role="alert"
                  className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-50 border border-red-100 text-xs font-medium text-red-600"
                >
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em] mb-1.5">
                    Username
                  </label>
                  <div className="relative group/inp">
                    <User
                      size={13}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/inp:text-violet-400 transition-colors pointer-events-none"
                    />
                    <input
                      type="text"
                      placeholder="your_username"
                      autoComplete="username"
                      {...register("username")}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all font-mono"
                    />
                  </div>
                  {errors.username && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em] mb-1.5">
                    Password
                  </label>
                  <div className="relative group/inp">
                    <Lock
                      size={13}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/inp:text-violet-400 transition-colors pointer-events-none"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      {...register("password")}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-[0.07em] mb-1.5">
                    Access Code
                  </label>
                  <div className="relative group/inp">
                    <KeyRound
                      size={13}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/inp:text-violet-400 transition-colors pointer-events-none"
                    />
                    <input
                      type={showCode ? "text" : "password"}
                      placeholder="••••••"
                      {...register("code")}
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-800 placeholder:text-slate-300 outline-none focus:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100 transition-all font-mono tracking-[0.25em]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      aria-label={
                        showCode ? "Hide access code" : "Show access code"
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors p-0.5 cursor-pointer"
                    >
                      {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.code && (
                    <p className="text-[11px] text-red-500 mt-1">
                      {errors.code.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group w-full flex items-center justify-center gap-2 py-3 mt-1 rounded-xl bg-violet-700 hover:bg-violet-600 text-white text-[13px] font-semibold transition-all shadow-lg shadow-violet-700/25 hover:shadow-violet-600/35 hover:-translate-y-px active:translate-y-0 disabled:opacity-55 disabled:cursor-not-allowed disabled:translate-y-0 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ArrowRight
                        size={13}
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-[11px] text-slate-300 mt-6">
                Authorized personnel only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


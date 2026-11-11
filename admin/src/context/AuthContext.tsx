import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  adminApi,
  getStoredTokens,
  setStoredTokens,
  setUnauthorizedHandler,
  type AdminProfile,
} from "@/api/client";

interface AuthContextValue {
  currentUser: AdminProfile | null;
  loading: boolean;
  can: (moduleKey: string) => boolean;
  canWrite: (moduleKey: string) => boolean;
  login: (creds: {
    username: string;
    password: string;
    code: string;
  }) => Promise<AdminProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    const tokens = getStoredTokens();
    if (!tokens?.accessToken) {
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await adminApi.me();
      setCurrentUser(profile);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setStoredTokens(null);
      setCurrentUser(null);
      if (window.location.pathname !== "/cms/login") {
        window.location.href = "/cms/login";
      }
    });
    if (window.location.hash.startsWith("#cms_auth=")) {
      try {
        const raw = decodeURIComponent(window.location.hash.slice("#cms_auth=".length));
        const parsed = JSON.parse(raw) as { access_token?: string; refresh_token?: string };
        if (parsed?.access_token && parsed?.refresh_token) {
          setStoredTokens({
            accessToken: parsed.access_token,
            refreshToken: parsed.refresh_token,
          });
        }
      } catch {
        // ignore malformed hash handoff
      }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    void loadMe();
  }, [loadMe]);

  const login = async (creds: {
    username: string;
    password: string;
    code: string;
  }) => {
    const res = await adminApi.login(creds);
    if (!res.tokens?.access_token || !res.tokens?.refresh_token || !res.user) {
      throw new Error("Invalid login response from server");
    }
    setStoredTokens({
      accessToken: res.tokens.access_token,
      refreshToken: res.tokens.refresh_token,
    });
    setCurrentUser(res.user);
    return res.user;
  };

  const logout = async () => {
    const tokens = getStoredTokens();
    try {
      await adminApi.logout(tokens?.refreshToken);
    } catch {
      // clear locally regardless
    }
    setStoredTokens(null);
    setCurrentUser(null);
  };

  const can = useCallback(
    (moduleKey: string) => {
      if (!currentUser) return false;
      if (currentUser.superuser) return true;
      if (moduleKey === "superuser") return false;
      return Boolean(currentUser.roles?.[moduleKey]?.read);
    },
    [currentUser]
  );

  const canWrite = useCallback(
    (moduleKey: string) => {
      if (!currentUser) return false;
      if (currentUser.superuser) return true;
      if (moduleKey === "superuser") return false;
      return Boolean(currentUser.roles?.[moduleKey]?.write);
    },
    [currentUser]
  );

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        can,
        canWrite,
        login,
        logout,
        refreshProfile: loadMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}


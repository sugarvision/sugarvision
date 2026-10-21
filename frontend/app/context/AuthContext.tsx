"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { User, Session } from "@supabase/supabase-js";
import {
  createClient,
  persistAuthToken,
  getActiveAuthToken,
} from "../../lib/supabase/client";

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  supabaseUser: User | null;
  session: Session | null;
  token: string | null;
  loading: boolean;
  isDemoSession: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: string | null; confirmationRequired?: boolean }>;
  signInDemo: (email?: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => string | null;
  // Aliases de conveniência
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: string | null; confirmationRequired?: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_STORAGE_KEY = "sugarvision_demo_user";

function formatAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    fullName:
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Operador UAV",
    role: user.user_metadata?.role || "Pesquisador UAV",
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(getActiveAuthToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Inicializa sessão do Supabase ou sessão persistida no navegador (LocalStorage / Cookies)
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        // 1. Obter sessão nativa do Supabase
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (initialSession?.user) {
          const jwtToken = initialSession.access_token;
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          setUser(formatAuthUser(initialSession.user));
          setToken(jwtToken);
          persistAuthToken(jwtToken);
          setIsDemoSession(false);
        } else {
          // 2. Verifica se há usuário demo salvo no LocalStorage
          if (typeof window !== "undefined") {
            const savedDemo = localStorage.getItem(DEMO_USER_STORAGE_KEY);
            if (savedDemo) {
              try {
                const parsed = JSON.parse(savedDemo);
                setUser(parsed);
                setIsDemoSession(true);
                const activeToken = getActiveAuthToken();
                setToken(activeToken);
              } catch {
                localStorage.removeItem(DEMO_USER_STORAGE_KEY);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao verificar sessão Supabase:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // 3. Listener de eventos do Supabase Auth (SIGN_IN, SIGN_OUT, TOKEN_REFRESHED, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);

        if (newSession?.user) {
          const jwtToken = newSession.access_token;
          setSupabaseUser(newSession.user);
          setUser(formatAuthUser(newSession.user));
          setToken(jwtToken);
          persistAuthToken(jwtToken);
          setIsDemoSession(false);
        } else if (!isDemoSession) {
          // Apenas limpa se não estiver em sessão demo explícita
          setSupabaseUser(null);
          setUser(null);
          setToken(null);
          persistAuthToken(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, isDemoSession]);

  // Login com Email e Senha via SDK do Supabase
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    try {
      const isPlaceholderKey =
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("dummy") ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

      if (!isPlaceholderKey) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.session && data.user) {
          const jwtToken = data.session.access_token;
          setSession(data.session);
          setSupabaseUser(data.user);
          setUser(formatAuthUser(data.user));
          setToken(jwtToken);
          persistAuthToken(jwtToken);
          setIsDemoSession(false);
          return { error: null };
        }

        if (error && !error.message.toLowerCase().includes("api key")) {
          return { error: error.message };
        }
      }

      // Modo de contingência para ambiente local / testes caso a chave ainda não tenha sido inserida
      const demoToken = "demo-jwt-sugarvision-token-" + Date.now();
      const localUser: AuthUser = {
        id: "usr-" + Math.random().toString(36).substring(2, 9),
        email,
        fullName: email.split("@")[0],
        role: "Pesquisador UAV",
      };

      setUser(localUser);
      setToken(demoToken);
      persistAuthToken(demoToken);
      if (typeof window !== "undefined") {
        localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(localUser));
      }
      setIsDemoSession(true);
      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao conectar ao Supabase.";
      return { error: msg };
    }
  };

  // Cadastro de Novo Usuário via SDK do Supabase
  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ error: string | null; confirmationRequired?: boolean }> => {
    try {
      const isPlaceholderKey =
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("dummy") ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

      if (!isPlaceholderKey) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName || email.split("@")[0],
              role: "Pesquisador de Campo",
            },
          },
        });

        if (!error && data.session && data.user) {
          const jwtToken = data.session.access_token;
          setSession(data.session);
          setSupabaseUser(data.user);
          setUser(formatAuthUser(data.user));
          setToken(jwtToken);
          persistAuthToken(jwtToken);
          setIsDemoSession(false);
          return { error: null, confirmationRequired: false };
        }

        if (error && !error.message.toLowerCase().includes("api key")) {
          return { error: error.message };
        }

        if (data && !data.session && data.user) {
          return { error: null, confirmationRequired: true };
        }
      }

      // Modo contingência local se chave do Supabase não configurada
      const demoToken = "demo-jwt-sugarvision-token-" + Date.now();
      const localUser: AuthUser = {
        id: "usr-" + Math.random().toString(36).substring(2, 9),
        email,
        fullName: fullName || email.split("@")[0],
        role: "Pesquisador de Campo",
      };

      setUser(localUser);
      setToken(demoToken);
      persistAuthToken(demoToken);
      if (typeof window !== "undefined") {
        localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(localUser));
      }
      setIsDemoSession(true);
      return { error: null, confirmationRequired: false };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao registrar no Supabase.";
      return { error: msg };
    }
  };

  // Acesso Rápido em Modo Demonstração (Permite validação e avaliação imediata)
  const signInDemo = async (
    email = "operador@sugarvision.agro",
    name = "Eng. Agrônomo"
  ) => {
    const demoToken = "demo-jwt-sugarvision-token-evaluation";
    const demoUser: AuthUser = {
      id: "demo-user-" + Date.now(),
      email,
      fullName: name,
      role: "Especialista em Trigo",
    };

    setToken(demoToken);
    persistAuthToken(demoToken);
    if (typeof window !== "undefined") {
      localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoUser));
    }
    setUser(demoUser);
    setIsDemoSession(true);
    setLoading(false);
  };

  // Logout / Encerramento de Sessão
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Erro ao deslogar do Supabase:", err);
    } finally {
      persistAuthToken(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      }
      setSession(null);
      setSupabaseUser(null);
      setUser(null);
      setToken(null);
      setIsDemoSession(false);
      router.push("/login");
    }
  };

  const getToken = () => {
    return token || getActiveAuthToken();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        token,
        loading,
        isDemoSession,
        isAuthenticated: !!token || !!user,
        signIn,
        signUp,
        signInDemo,
        signOut,
        getToken,
        login: signIn,
        register: signUp,
        logout: signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um <AuthProvider>");
  }
  return context;
}

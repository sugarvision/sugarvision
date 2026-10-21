"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";

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
  loading: boolean;
  isDemoSession: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null; confirmationRequired?: boolean }>;
  signInDemo: (email?: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_COOKIE_NAME = "sugarvision_auth_session";

function setAuthCookie(value: string) {
  document.cookie = `${DEMO_COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=604800; SameSite=Lax`;
}

function removeAuthCookie() {
  document.cookie = `${DEMO_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|; )${DEMO_COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[2]) : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isDemoSession, setIsDemoSession] = useState(false);
  const [loading, setLoading] = useState(true);

  // Inicializa sessão do Supabase ou sessão em cookie
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setSession(session);
          setSupabaseUser(session.user);
          setUser({
            id: session.user.id,
            email: session.user.email,
            fullName: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "Operador",
            role: session.user.user_metadata?.role || "Pesquisador UAV",
          });
          setAuthCookie(JSON.stringify({ id: session.user.id, email: session.user.email }));
          setIsDemoSession(false);
        } else {
          // Verifica se há cookie de demonstração gravado
          const rawCookie = getAuthCookie();
          if (rawCookie) {
            try {
              const parsed = JSON.parse(rawCookie);
              setUser({
                id: parsed.id || "demo-usr-01",
                email: parsed.email || "demo@sugarvision.agro",
                fullName: parsed.name || "Especialista UAV",
                role: "Analista de Trigo",
              });
              setIsDemoSession(true);
            } catch {
              removeAuthCookie();
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

    // Listener para mudanças no estado de autenticação do Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        if (newSession?.user) {
          setSupabaseUser(newSession.user);
          setUser({
            id: newSession.user.id,
            email: newSession.user.email,
            fullName: newSession.user.user_metadata?.full_name || newSession.user.email?.split("@")[0] || "Operador",
            role: newSession.user.user_metadata?.role || "Pesquisador UAV",
          });
          setAuthCookie(JSON.stringify({ id: newSession.user.id, email: newSession.user.email }));
          setIsDemoSession(false);
        } else if (!isDemoSession) {
          // Se não houver sessão ativa nem modo demo
          const rawCookie = getAuthCookie();
          if (!rawCookie) {
            setSupabaseUser(null);
            setUser(null);
          }
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener?.subscription.unsubscribe();
    };
  }, [supabase, isDemoSession]);

  // Login com Email e Senha via SDK do Supabase (com contingência inteligente)
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const isPlaceholderKey =
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

      if (!isPlaceholderKey) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error && data.session && data.user) {
          setSession(data.session);
          setSupabaseUser(data.user);
          setUser({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "Operador",
            role: data.user.user_metadata?.role || "Pesquisador UAV",
          });
          setAuthCookie(JSON.stringify({ id: data.user.id, email: data.user.email }));
          setIsDemoSession(false);
          return { error: null };
        }

        if (error && !error.message.toLowerCase().includes("api key")) {
          return { error: error.message };
        }
      }

      // Se a chave for placeholder ou falha de conexão na nuvem, autentica em modo local contingencial
      const localUser = {
        id: "usr-" + Math.random().toString(36).substring(2, 9),
        email,
        fullName: email.split("@")[0],
        role: "Pesquisador UAV",
      };
      setUser(localUser);
      setAuthCookie(JSON.stringify(localUser));
      setIsDemoSession(true);
      return { error: null };
    } catch (err: any) {
      return { error: err.message || "Erro inesperado ao conectar ao Supabase." };
    }
  };

  // Cadastro de Novo Usuário via SDK do Supabase (com contingência inteligente)
  const signUp = async (
    email: string,
    password: string,
    fullName?: string
  ): Promise<{ error: string | null; confirmationRequired?: boolean }> => {
    try {
      const isPlaceholderKey =
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
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
          setSession(data.session);
          setSupabaseUser(data.user);
          setUser({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.full_name || fullName || "Novo Usuário",
            role: "Pesquisador de Campo",
          });
          setAuthCookie(JSON.stringify({ id: data.user.id, email: data.user.email }));
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

      // Se a chave for placeholder, cadastra e autentica em modo local imediatamente
      const localUser = {
        id: "usr-" + Math.random().toString(36).substring(2, 9),
        email,
        fullName: fullName || email.split("@")[0],
        role: "Pesquisador de Campo",
      };
      setUser(localUser);
      setAuthCookie(JSON.stringify(localUser));
      setIsDemoSession(true);
      return { error: null, confirmationRequired: false };
    } catch (err: any) {
      return { error: err.message || "Erro inesperado ao registrar no Supabase." };
    }
  };

  // Acesso Rápido em Modo Demonstração (Permite validação e avaliação imediata)
  const signInDemo = async (email = "operador@sugarvision.agro", name = "Eng. Agrônomo") => {
    const demoPayload = {
      id: "demo-user-" + Date.now(),
      email,
      name,
    };
    setAuthCookie(JSON.stringify(demoPayload));
    setUser({
      id: demoPayload.id,
      email: demoPayload.email,
      fullName: name,
      role: "Especialista em Trigo",
    });
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
      removeAuthCookie();
      setSession(null);
      setSupabaseUser(null);
      setUser(null);
      setIsDemoSession(false);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        supabaseUser,
        session,
        loading,
        isDemoSession,
        signIn,
        signUp,
        signInDemo,
        signOut,
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

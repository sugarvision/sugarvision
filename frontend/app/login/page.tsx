"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
// 1. Importação do Supabase adicionada aqui
import { createClient } from "../../lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const { signIn, signInDemo, user, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Se o usuário já estiver logado, redireciona direto para o painel de controle
  useEffect(() => {
    if (!authLoading && user) {
      window.location.href = redirectTo;
    }
  }, [user, authLoading, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email.trim(), password);

      if (error) {
        // Traduz mensagens comuns do Supabase
        if (error.includes("Invalid login credentials")) {
          setErrorMessage("E-mail ou senha incorretos. Verifique suas credenciais.");
        } else if (error.includes("Email not confirmed")) {
          setErrorMessage("E-mail não confirmado. Verifique sua caixa de entrada.");
        } else {
          setErrorMessage(error);
        }
        setIsLoading(false);
        return;
      }

      toast.success("Autenticação realizada com sucesso! Redirecionando...", {
        position: "top-right",
        autoClose: 2000,
        theme: "dark",
      });

      // Redireciona direto para o painel de controle (/ ou rota requisitada)
      router.push(redirectTo);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao realizar login.");
      setIsLoading(false);
    }
  };

  // 2. Função handleDemoLogin atualizada para Login Anônimo
  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setErrorMessage(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInAnonymously();

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Sessão de demonstração autorizada! Acessando painel...", {
        position: "top-right",
        autoClose: 1800,
        theme: "dark",
      });
      
      window.location.href = redirectTo;
    } catch (err: any) {
      console.error("Erro no login anônimo:", err);
      setErrorMessage("Erro ao iniciar sessão de demonstração. Verifique se o login anônimo está ativado no Supabase.");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "460px",
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "16px",
        padding: "36px 32px",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.6), 0 0 30px -10px var(--accent-green-glow)",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, var(--accent-green), #14532d)",
            boxShadow: "0 8px 24px rgba(46, 160, 67, 0.35)",
            marginBottom: "16px",
          }}
        >
          <svg
            className="w-7 h-7 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <circle cx="12" cy="12" r="3" />
            <path d="M12 16v3M12 5v3M16 12h3M5 12h3" />
          </svg>
        </div>

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "4px 10px",
            borderRadius: "12px",
            background: "rgba(46, 160, 67, 0.12)",
            border: "1px solid rgba(46, 160, 67, 0.3)",
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--accent-green)",
            marginBottom: "10px",
            letterSpacing: "0.5px",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--accent-green)",
            }}
          />
          Plataforma SugarVision IA
        </div>

        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            color: "var(--foreground)",
            margin: "0 0 6px 0",
            letterSpacing: "-0.5px",
          }}
        >
          Acesso ao Sistema
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Painel de controle e monitoramento UAV para lavouras de trigo
        </p>
      </div>

      {/* Alerta de erro */}
      {errorMessage && (
        <div
          id="login-error-alert"
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "12px 14px",
            borderRadius: "8px",
            background: "rgba(248, 81, 73, 0.12)",
            border: "1px solid rgba(248, 81, 73, 0.4)",
            color: "#f85149",
            fontSize: "13px",
            marginBottom: "20px",
            lineHeight: 1.4,
          }}
        >
          <svg
            className="w-5 h-5 flex-shrink-0"
            style={{ marginTop: "1px" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div style={{ flex: 1 }}>{errorMessage}</div>
          <button
            onClick={() => setErrorMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#f85149",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Formulário de Login */}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Campo E-mail */}
        <div>
          <label
            htmlFor="email"
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--foreground)",
              marginBottom: "6px",
            }}
          >
            E-mail Institucional ou Pessoal
          </label>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </span>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="seu.email@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px 10px 38px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-green)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-green-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--card-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>
        </div>

        {/* Campo Senha */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label
              htmlFor="password"
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--foreground)",
              }}
            >
              Senha
            </label>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Mínimo 6 caracteres</span>
          </div>
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 40px 10px 38px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--accent-green)";
                e.currentTarget.style.boxShadow = "0 0 0 2px var(--accent-green-glow)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--card-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: 0,
              }}
              title={showPassword ? "Ocultar senha" : "Ver senha"}
            >
              {showPassword ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                  <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                  <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                  <line x1="2" y1="2" x2="22" y2="22" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Opção Lembrar-me */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--muted)" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                accentColor: "var(--accent-green)",
                width: "15px",
                height: "15px",
                cursor: "pointer",
              }}
            />
            Lembrar esta sessão
          </label>
          <span style={{ fontSize: "12px", color: "var(--accent-green)", cursor: "default" }}>
            Autenticação Supabase
          </span>
        </div>

        {/* Botão Entrar */}
        <button
          id="login-submit-btn"
          type="submit"
          disabled={isLoading || isDemoLoading}
          style={{
            width: "100%",
            padding: "11px 16px",
            borderRadius: "8px",
            background: "linear-gradient(135deg, var(--accent-green), #238636)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            color: "#ffffff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: isLoading || isDemoLoading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(46, 160, 67, 0.3)",
            transition: "all 0.2s ease",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              <span>Autenticando no Supabase...</span>
            </>
          ) : (
            <>
              <span>Entrar no Painel</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Divisor */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "24px 0",
          color: "var(--muted)",
          fontSize: "12px",
        }}
      >
        <div style={{ flex: 1, height: "1px", background: "var(--card-border)" }} />
        <span>ou avaliação rápida</span>
        <div style={{ flex: 1, height: "1px", background: "var(--card-border)" }} />
      </div>

      {/* Botão de Demonstração / Contingência */}
      <button
        id="login-demo-btn"
        type="button"
        onClick={handleDemoLogin}
        disabled={isLoading || isDemoLoading}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: "8px",
          background: "var(--surface)",
          border: "1px dashed rgba(46, 160, 67, 0.4)",
          color: "var(--foreground)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: isLoading || isDemoLoading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent-green)";
          e.currentTarget.style.background = "rgba(46, 160, 67, 0.08)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(46, 160, 67, 0.4)";
          e.currentTarget.style.background = "var(--surface)";
        }}
      >
        {isDemoLoading ? (
          <span style={{ color: "var(--accent-green)" }}>Iniciando modo demonstração...</span>
        ) : (
          <>
            <svg className="w-4 h-4 text-[var(--accent-green)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Acesso Rápido — Modo Avaliação / Demo</span>
          </>
        )}
      </button>

      {/* Rodapé: Link para Cadastro */}
      <div
        style={{
          marginTop: "24px",
          paddingTop: "16px",
          borderTop: "1px solid var(--card-border)",
          textAlign: "center",
          fontSize: "13px",
          color: "var(--muted)",
        }}
      >
        Não possui uma conta de acesso?{" "}
        <Link
          href={`/register${redirectTo !== "/" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          style={{
            color: "var(--accent-green)",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Cadastre-se aqui
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(ellipse at top, #16241a 0%, #0d1117 70%)",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Decorative Rings */}
      <div
        style={{
          position: "absolute",
          top: "-150px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(46, 160, 67, 0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <Suspense
        fallback={
          <div style={{ color: "var(--muted)", fontSize: "14px" }}>
            Carregando interface de autenticação...
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
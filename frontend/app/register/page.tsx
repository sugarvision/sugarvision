"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/";

  const { signUp, user, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationNotice, setConfirmationNotice] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      router.push(redirectTo);
    }
  }, [user, authLoading, router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage("Por favor, preencha os campos de e-mail e senha.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("É necessário aceitar os termos de uso da plataforma.");
      return;
    }

    setIsLoading(true);

    try {
      const { error, confirmationRequired } = await signUp(
        email.trim(),
        password,
        fullName.trim() || undefined
      );

      if (error) {
        if (error.includes("User already registered")) {
          setErrorMessage("Este e-mail já possui cadastro. Faça login ou recupere sua senha.");
        } else {
          setErrorMessage(error);
        }
        setIsLoading(false);
        return;
      }

      if (confirmationRequired) {
        setConfirmationNotice(true);
        toast.info("Cadastro realizado! Verifique seu e-mail para ativar a conta.", {
          position: "top-right",
          autoClose: 5000,
          theme: "dark",
        });
      } else {
        toast.success("Conta criada e autenticada com sucesso! Redirecionando...", {
          position: "top-right",
          autoClose: 2000,
          theme: "dark",
        });
        router.push(redirectTo);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao registrar usuário.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "480px",
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "16px",
        padding: "36px 32px",
        boxShadow: "0 20px 40px -15px rgba(0,0,0,0.6), 0 0 30px -10px var(--accent-green-glow)",
        position: "relative",
        zIndex: 10,
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "26px" }}>
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
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
          Cadastro de Operador UAV
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
          Criar Nova Conta
        </h1>
        <p
          style={{
            fontSize: "13px",
            color: "var(--muted)",
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Acesso aos recursos de análise e mapas da cultura de trigo
        </p>
      </div>

      {/* Aviso de Confirmação de E-mail */}
      {confirmationNotice ? (
        <div
          style={{
            padding: "20px",
            borderRadius: "10px",
            background: "rgba(46, 160, 67, 0.1)",
            border: "1px solid rgba(46, 160, 67, 0.3)",
            textAlign: "center",
          }}
        >
          <svg className="w-12 h-12 text-[var(--accent-green)] mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z" />
            <polyline points="3,7 12,13 21,7" />
          </svg>
          <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", margin: "0 0 8px 0" }}>
            E-mail de Ativação Enviado!
          </h3>
          <p style={{ fontSize: "13px", color: "var(--muted)", lineHeight: 1.5, marginBottom: "18px" }}>
            Enviamos um link de confirmação para <strong>{email}</strong>. Abra a mensagem e confirme para acessar o painel de trigo.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "9px 18px",
              borderRadius: "8px",
              background: "var(--accent-green)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Ir para Tela de Login
          </Link>
        </div>
      ) : (
        <>
          {/* Mensagem de Erro */}
          {errorMessage && (
            <div
              id="register-error-alert"
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
              <svg className="w-5 h-5 flex-shrink-0" style={{ marginTop: "1px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

          {/* Formulário de Registro */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Nome Completo */}
            <div>
              <label
                htmlFor="fullname"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "6px",
                }}
              >
                Nome Completo ou Instituição
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
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="fullname"
                  type="text"
                  placeholder="Ex: Dra. Mariana Costa"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
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

            {/* E-mail */}
            <div>
              <label
                htmlFor="register-email"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "6px",
                }}
              >
                E-mail para Acesso *
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
                  id="register-email"
                  type="email"
                  required
                  placeholder="pesquisador@instituto.org"
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

            {/* Senha */}
            <div>
              <label
                htmlFor="register-password"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "6px",
                }}
              >
                Senha de Acesso (mínimo 6 dígitos) *
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
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
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
                    padding: 0,
                  }}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {/* Confirmação de Senha */}
            <div>
              <label
                htmlFor="confirm-password"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--foreground)",
                  marginBottom: "6px",
                }}
              >
                Confirmar Senha *
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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

            {/* Termos de Uso */}
            <div style={{ marginTop: "4px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: "8px", cursor: "pointer", fontSize: "12px", color: "var(--muted)", lineHeight: 1.4 }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{
                    accentColor: "var(--accent-green)",
                    width: "15px",
                    height: "15px",
                    marginTop: "2px",
                    cursor: "pointer",
                  }}
                />
                Declaro conformidade com as diretrizes de telemetria agrícola e dados sensíveis de lavouras.
              </label>
            </div>

            {/* Botão Cadastrar */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "11px 16px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--accent-green), #238636)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                boxShadow: "0 4px 12px rgba(46, 160, 67, 0.3)",
                transition: "all 0.2s ease",
                marginTop: "6px",
                opacity: isLoading ? 0.7 : 1,
              }}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                    <path d="M12 2a10 10 0 0 1 10 10" />
                  </svg>
                  <span>Registrando no Supabase...</span>
                </>
              ) : (
                <>
                  <span>Criar Conta de Pesquisador</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Link para Login */}
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
            Já possui uma conta registrada?{" "}
            <Link
              href={`/login${redirectTo !== "/" ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
              style={{
                color: "var(--accent-green)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Entrar aqui
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function RegisterPage() {
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
            Carregando interface de cadastro...
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </main>
  );
}

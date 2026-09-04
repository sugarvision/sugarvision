"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ToastContainer, toast } from "react-toastify";
import {
  Sidebar,
  IconDrone,
  IconMap,
  IconAlert,
  IconLeaf,
  IconLayers,
  IconX,
  IconPlus,
  IconMenu,
  IconUploadCloud,
  IconFileImage,
} from "./components/Sidebar";
import {
  TALHOES_MOCK_DATA,
  computeFieldMetrics,
  formatNumberBR,
} from "./utils/geoMath";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => <p style={{ padding: "20px", color: "var(--muted)" }}>Carregando mapa...</p>,
});

// ── Stat Card (Dashboard de Hectares) ──────────────────────────────────────────
function StatCard({
  label,
  value,
  unit,
  subtitle,
  badge,
  badgeType = "neutral",
  color = "var(--foreground)",
  icon: Icon,
  percentage,
}: {
  label: string;
  value: string;
  unit: string;
  subtitle?: string;
  badge?: string;
  badgeType?: "success" | "danger" | "warning" | "info" | "neutral";
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
  percentage?: number;
}) {
  const badgeStyles = {
    success: { bg: "rgba(46, 160, 67, 0.15)", border: "rgba(46, 160, 67, 0.3)", text: "#3fb950" },
    danger: { bg: "rgba(248, 81, 73, 0.15)", border: "rgba(248, 81, 73, 0.3)", text: "#f85149" },
    warning: { bg: "rgba(210, 153, 34, 0.15)", border: "rgba(210, 153, 34, 0.3)", text: "#d29922" },
    info: { bg: "rgba(88, 166, 255, 0.15)", border: "rgba(88, 166, 255, 0.3)", text: "#58a6ff" },
    neutral: { bg: "rgba(255, 255, 255, 0.08)", border: "rgba(255, 255, 255, 0.15)", text: "var(--muted)" },
  }[badgeType];

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "12px",
        padding: "16px 18px",
        flex: "1 1 200px",
        minWidth: "0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "10px",
        boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s ease, border-color 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "rgba(46, 160, 67, 0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = "var(--card-border)";
      }}
    >
      {/* Header: Label & Icon */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span
          style={{
            fontSize: "11.5px",
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
        {Icon && (
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: color || "var(--muted)",
            }}
          >
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Main Big Number */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", margin: "2px 0" }}>
        <span
          style={{
            fontSize: "26px",
            fontWeight: 800,
            color,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </span>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--muted)" }}>
          {unit}
        </span>

        {badge && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "999px",
              background: badgeStyles.bg,
              border: `1px solid ${badgeStyles.border}`,
              color: badgeStyles.text,
              lineHeight: "1.4",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Subtitle & Percentage Progress */}
      {subtitle && (
        <div style={{ fontSize: "11.5px", color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
          <span>{subtitle}</span>
          {percentage !== undefined && (
            <span style={{ fontWeight: 600, color }}>{percentage.toFixed(1)}%</span>
          )}
        </div>
      )}

      {percentage !== undefined && (
        <div
          style={{
            width: "100%",
            height: "4px",
            borderRadius: "2px",
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
            marginTop: "2px",
          }}
        >
          <div
            style={{
              width: `${Math.min(100, Math.max(0, percentage))}%`,
              height: "100%",
              background: color,
              borderRadius: "2px",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
interface BackendUploadResponse {
  status: string;
  message: string;
  filename: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  saved_path: string;
}

function HomeContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccessData, setUploadSuccessData] = useState<{
    backend: BackendUploadResponse;
    localPreview: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estado do Talhão e Cálculo Matemático da Sprint 5
  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>("talhao-01-rio-claro");
  const [showFailureDetails, setShowFailureDetails] = useState<boolean>(false);

  const searchParams = useSearchParams();
  const talhaoQuery = searchParams.get("talhao");

  // Sincroniza o talhão selecionado via URL se vier da tela de Histórico de Vôos ("Ver no Mapa")
  useEffect(() => {
    if (talhaoQuery && TALHOES_MOCK_DATA.some((t) => t.id === talhaoQuery)) {
      setSelectedTalhaoId(talhaoQuery);
    }
  }, [talhaoQuery]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Obtém o talhão ativo e executa a função matemática de consolidação de área em tempo real
  const currentTalhao =
    TALHOES_MOCK_DATA.find((t) => t.id === selectedTalhaoId) || TALHOES_MOCK_DATA[0];
  const metrics = computeFieldMetrics(currentTalhao);

  // Dispara a janela nativa do Windows para seleção de arquivo
  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Limpa para permitir selecionar o mesmo arquivo novamente
      fileInputRef.current.click();
    }
  };

  // Captura o arquivo selecionado, valida o formato e envia via fetch() para o backend FastAPI
  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Validação de formato/extensão (Sprint 6)
    const fileName = file.name.toLowerCase();
    const isJpgOrPng =
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      file.type === "image/jpeg" ||
      file.type === "image/png";

    if (!isJpgOrPng) {
      // Notificação vermelha com a mensagem exigida pela Sprint 6
      toast.error("Erro: Apenas formatos JPG e PNG são permitidos", {
        position: "top-right",
        autoClose: 4500,
        theme: "dark",
      });

      // Reseta o input para permitir nova seleção sem travar o sistema
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploadLoading(true);

    // URL local para preview imediato da imagem
    const localPreviewUrl = URL.createObjectURL(file);

    // Cria o FormData estruturado conforme esperado pelo endpoint POST /upload
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorDetail = `Erro HTTP ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.detail) errorDetail = errData.detail;
        } catch {
          // Mantém mensagem padrão
        }
        throw new Error(errorDetail);
      }

      const result: BackendUploadResponse = await response.json();

      setUploadSuccessData({
        backend: result,
        localPreview: localPreviewUrl,
      });
      setIsModalOpen(true);

      // Aviso verde com a mensagem exigida pela Sprint 6
      toast.success("Análise concluída!", {
        position: "top-right",
        autoClose: 4000,
        theme: "dark",
      });
    } catch (err: unknown) {
      console.error("Erro durante o upload da imagem UAV:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Não foi possível conectar ao servidor backend (http://localhost:8000). Certifique-se de que o FastAPI está ativo.";

      toast.error(`Erro: ${errorMsg}`, {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
    } finally {
      // Garante que o loading é liberado e o sistema nunca trava
      setUploadLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      {/* ── Container Global de Notificações Toast (Sprint 6) ─── */}
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      {/* ── Input Oculto de Arquivo (Windows Dialog) ─────────── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,.jpg,.jpeg,.png,application/pdf"
        style={{ display: "none" }}
        id="uav-file-input"
      />

      {/* ── Modal de Detalhes do Upload ─────────────────────── */}
      {isModalOpen && uploadSuccessData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9990,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="fade-in-up"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    background: "rgba(46,160,67,0.15)",
                    border: "1px solid rgba(46,160,67,0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent-green)",
                  }}
                >
                  <IconUploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                    Nova Análise UAV Enviada
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0 0" }}>
                    Imagem recebida e armazenada pelo servidor backend
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "6px",
                  borderRadius: "6px",
                }}
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview */}
            <div
              style={{
                borderRadius: "10px",
                overflow: "hidden",
                border: "1px solid var(--sidebar-border)",
                background: "#0d1117",
                maxHeight: "260px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadSuccessData.localPreview}
                alt={uploadSuccessData.backend.original_filename}
                style={{
                  maxWidth: "100%",
                  maxHeight: "260px",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Metadados do Arquivo */}
            <div
              style={{
                background: "var(--surface)",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "12.5px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <IconFileImage className="w-4 h-4 text-muted" />
                  Arquivo original:
                </span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{uploadSuccessData.backend.original_filename}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Nome no Servidor:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11.5px", color: "#58a6ff" }}>{uploadSuccessData.backend.filename}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Tamanho:</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{formatFileSize(uploadSuccessData.backend.size_bytes)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Tipo de Conteúdo:</span>
                <span style={{ color: "var(--foreground)" }}>{uploadSuccessData.backend.content_type}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Status do Backend:</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-green)" }} />
                  Pronto para Inferência IA / YOLO
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={handleOpenFileDialog}
                style={{
                  padding: "9px 16px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Enviar Outra Imagem
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: "9px 20px",
                  borderRadius: "8px",
                  background: "var(--accent-green)",
                  border: "none",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(true)}
      />

      {/* ── Main content ────────────────────────────────── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Top bar */}
        <header
          style={{
            height: "64px",
            borderBottom: "1px solid var(--sidebar-border)",
            background: "var(--sidebar-bg)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: "16px",
            flexShrink: 0,
          }}
        >
          {/* Expand sidebar button (shown when collapsed) */}
          {sidebarCollapsed && (
            <button
              id="sidebar-expand-btn"
              onClick={() => setSidebarCollapsed(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--foreground)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--muted)")
              }
              aria-label="Expandir menu lateral"
            >
              <IconMenu className="w-5 h-5" />
            </button>
          )}

          {/* Breadcrumb */}
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--foreground)",
                margin: 0,
                lineHeight: 1,
              }}
            >
              Painel de Hectares & Monitoramento UAV
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "3px 0 0 0",
                lineHeight: 1,
              }}
            >
              Cálculo geométrico geodésico de áreas de plantio e detecção de falhas
            </p>
          </div>

          {/* Status indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "5px 12px",
              borderRadius: "999px",
              background: "rgba(46,160,67,0.1)",
              border: "1px solid rgba(46,160,67,0.25)",
            }}
          >
            <span
              className="pulse-dot"
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "var(--accent-green)",
                flexShrink: 0,
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--accent-green)",
              }}
            >
              Sistema online
            </span>
          </div>

          {/* ✅ BOTÃO PRINCIPAL: Nova Análise UAV */}
          <button
            id="btn-nova-analise-uav"
            onClick={handleOpenFileDialog}
            disabled={uploadLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "8px",
              background: uploadLoading
                ? "rgba(46,160,67,0.5)"
                : "var(--accent-green)",
              border: "none",
              cursor: uploadLoading ? "not-allowed" : "pointer",
              color: "#fff",
              fontSize: "13.5px",
              fontWeight: 600,
              letterSpacing: "0.01em",
              boxShadow: uploadLoading
                ? "none"
                : "0 0 0 1px rgba(46,160,67,0.4), 0 4px 12px rgba(46,160,67,0.3)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!uploadLoading) {
                e.currentTarget.style.background = "var(--accent-green-hover)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 1px rgba(46,160,67,0.6), 0 6px 20px rgba(46,160,67,0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!uploadLoading) {
                e.currentTarget.style.background = "var(--accent-green)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 1px rgba(46,160,67,0.4), 0 4px 12px rgba(46,160,67,0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
            aria-label="Nova Análise UAV"
          >
            {uploadLoading ? (
              <>
                <svg
                  style={{
                    animation: "spin 1s linear infinite",
                    width: "15px",
                    height: "15px",
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Enviando Imagem...
              </>
            ) : (
              <>
                <IconPlus className="w-4 h-4" />
                Nova Análise UAV
              </>
            )}
          </button>
        </header>

        {/* Content area */}
        <div
          style={{
            flex: 1,
            overflow: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* ── 🌾 Faixa de Destaque Dinâmica (Dashboard de Hectares) ──────── */}
          <div
            className="fade-in-up"
            style={{
              background: "linear-gradient(90deg, rgba(46, 160, 67, 0.14) 0%, rgba(22, 27, 34, 0.95) 100%)",
              border: "1px solid rgba(46, 160, 67, 0.35)",
              borderRadius: "10px",
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
                fontSize: "13px",
              }}
            >
              {/* Total Analisado */}
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--foreground)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#58a6ff" }} />
                <span>Total Analisado:</span>
                <strong style={{ color: "#58a6ff", fontSize: "14px" }}>
                  {formatNumberBR(metrics.totalFieldHa, 1)} Hectares
                </strong>
                <span style={{ color: "var(--muted)", fontSize: "11.5px" }}>
                  ({formatNumberBR(metrics.totalFieldM2, 0)} m²)
                </span>
              </span>

              <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>

              {/* Falhas de Plantio */}
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--foreground)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f85149" }} />
                <span>Falhas de Plantio:</span>
                <strong style={{ color: "#f85149", fontSize: "14px" }}>
                  {formatNumberBR(metrics.failureHa, 1)} Hectares ({formatNumberBR(metrics.failurePercent, 1)}%)
                </strong>
                <span style={{ color: "var(--muted)", fontSize: "11.5px" }}>
                  ({formatNumberBR(metrics.failureM2, 0)} m²)
                </span>
              </span>

              <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>

              {/* Estande Produtivo */}
              <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--foreground)" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-green)" }} />
                <span>Estande Útil:</span>
                <strong style={{ color: "#3fb950", fontSize: "14px" }}>
                  {formatNumberBR(metrics.productiveHa, 1)} Hectares ({formatNumberBR(metrics.standPercent, 1)}%)
                </strong>
              </span>
            </div>

            {/* Seletor de Talhão */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Talhão Ativo:
              </span>
              <select
                value={selectedTalhaoId}
                onChange={(e) => setSelectedTalhaoId(e.target.value)}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                {TALHOES_MOCK_DATA.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({t.cidade})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── 📊 CARDS NUMÉRICOS DE HECTARES (Sprint 5) ───────────── */}
          <div
            className="fade-in-up"
            style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
          >
            <StatCard
              label="Total Analisado"
              value={formatNumberBR(metrics.totalFieldHa, 1)}
              unit="ha"
              subtitle={`${formatNumberBR(metrics.totalFieldM2, 0)} m² mapeados`}
              badge="100% Área"
              badgeType="info"
              color="#58a6ff"
              icon={IconMap}
              percentage={100}
            />
            <StatCard
              label="Falhas de Plantio"
              value={formatNumberBR(metrics.failureHa, 1)}
              unit="ha"
              subtitle={`${formatNumberBR(metrics.failureM2, 0)} m² com perda`}
              badge={`${formatNumberBR(metrics.failurePercent, 1)}% Perda`}
              badgeType="danger"
              color="#f85149"
              icon={IconAlert}
              percentage={metrics.failurePercent}
            />
            <StatCard
              label="Estande Produtivo"
              value={formatNumberBR(metrics.productiveHa, 1)}
              unit="ha"
              subtitle={`${formatNumberBR(metrics.totalFieldM2 - metrics.failureM2, 0)} m² úteis`}
              badge={`${formatNumberBR(metrics.standPercent, 1)}% Efetivo`}
              badgeType="success"
              color="var(--accent-green)"
              icon={IconLeaf}
              percentage={metrics.standPercent}
            />
            <StatCard
              label="Polígonos de Falha"
              value={String(metrics.failureCount)}
              unit="polígonos"
              subtitle="Detectados via UAV / IA"
              badge={metrics.failurePercent > 10 ? "Severidade Alta" : "Severidade Média"}
              badgeType={metrics.failurePercent > 10 ? "danger" : "warning"}
              color="#ffa657"
              icon={IconDrone}
            />
          </div>

          {/* ── Mapa Interativo e Polígonos de Falha ───────────────── */}
          <div
            style={{
              flex: 1,
              minHeight: "400px",
              borderRadius: "12px",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <MapComponent talhao={currentTalhao} />

            {/* Botão flutuante para detalhamento dos polígonos */}
            <div
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                zIndex: 1000,
              }}
            >
              <button
                onClick={() => setShowFailureDetails(!showFailureDetails)}
                style={{
                  background: "rgba(22, 27, 34, 0.9)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backdropFilter: "blur(6px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                }}
              >
                <IconLayers className="w-4 h-4 text-[#58a6ff]" />
                {showFailureDetails ? "Ocultar Polígonos" : "Ver Polígonos de Falha"}
                <span
                  style={{
                    background: "#da3633",
                    color: "#fff",
                    borderRadius: "999px",
                    padding: "1px 6px",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  {metrics.failureCount}
                </span>
              </button>
            </div>

            {/* Painel Flutuante de Detalhamento dos Polígonos de Falha */}
            {showFailureDetails && (
              <div
                className="fade-in-up"
                style={{
                  position: "absolute",
                  bottom: "16px",
                  right: "16px",
                  zIndex: 1000,
                  background: "rgba(22, 27, 34, 0.95)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  width: "340px",
                  maxHeight: "280px",
                  overflowY: "auto",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--foreground)" }}>
                    Detalhamento dos Polígonos
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Soma: {formatNumberBR(metrics.failureHa, 1)} ha
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {currentTalhao.falhas.map((f, idx) => {
                    const fAreaM2 = f.customAreaM2 || 0;
                    const fAreaHa = fAreaM2 / 10000;
                    return (
                      <div
                        key={f.id}
                        style={{
                          background: "var(--surface)",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          border: "1px solid rgba(248, 81, 73, 0.2)",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "var(--foreground)" }}>
                          <span>#{idx + 1} {f.name}</span>
                          <span style={{ color: "#f85149" }}>{formatNumberBR(fAreaHa, 2)} ha</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: "11px", marginTop: "3px" }}>
                          <span>Área: {formatNumberBR(fAreaM2, 0)} m²</span>
                          <span style={{ textTransform: "capitalize", color: f.severity === "alta" ? "#f85149" : "#d29922" }}>
                            {f.severity}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Faixa de Informações Agronômicas da Safra ───────────── */}
          <div
            className="fade-in-up"
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              animationDelay: "0.2s",
              opacity: 0,
            }}
          >
            {[
              {
                icon: "🌱",
                title: currentTalhao.cultura,
                desc: `${currentTalhao.variedade} — ${formatNumberBR(metrics.totalFieldHa, 0)} ha`,
              },
              {
                icon: "📡",
                title: "Voo de Mapeamento",
                desc: `${currentTalhao.dataMapeamento} às 07:14`,
              },
              {
                icon: "📍",
                title: "Localização",
                desc: currentTalhao.cidade,
              },
              {
                icon: "🚜",
                title: "Recomendação Agronômica",
                desc: `Replantio localizado em ${formatNumberBR(metrics.failureHa, 1)} ha`,
              },
            ].map((item) => (
              <div
                key={item.title}
                style={{
                  flex: "1 1 180px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  borderRadius: "10px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <span style={{ fontSize: "22px", flexShrink: 0 }}>
                  {item.icon}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--foreground)",
                    }}
                  >
                    {item.title}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Spin keyframe via style tag */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "var(--background)",
            color: "var(--muted)",
            fontSize: "14px",
          }}
        >
          Carregando Painel SugarVision...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}


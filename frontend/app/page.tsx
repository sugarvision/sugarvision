"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ToastContainer, toast } from "react-toastify";
import {
  Sidebar,
  IconScan,
  IconChart,
  IconAlert,
  IconLeaf,
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
import type { WeedDetection } from "./ImageDetectionViewer";

const ImageDetectionViewer = dynamic(() => import("./ImageDetectionViewer"), {
  ssr: false,
  loading: () => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--muted)" }}>
      Carregando foto de campo...
    </div>
  ),
});

// ── Stat Card (Métricas em m² e % de Infestação Foliar) ──────────────────────
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

// ── Main Page Content ─────────────────────────────────────────────────────────
interface BackendUploadResponse {
  status: string;
  message: string;
  filename: string;
  original_filename: string;
  content_type: string;
  size_bytes: number;
  saved_path: string;
  ai_status?: string;
  detections?: WeedDetection[];
  summary?: {
    total_detecoes?: number;
    total_ervas_daninhas?: number;
    total_cana?: number;
    taxa_infestacao_percent?: number;
    area_infestada_m2?: number;
    area_infestada_ha?: number;
    distribuicao_severidade_ervas?: Record<string, number>;
  };
}

function HomeContent() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadSuccessData, setUploadSuccessData] = useState<{
    backend: BackendUploadResponse;
    localPreview: string;
  } | null>(null);
  const [activeDetections, setActiveDetections] = useState<WeedDetection[] | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>("talhao-01-rio-claro");

  const searchParams = useSearchParams();
  const talhaoQuery = searchParams.get("talhao");

  useEffect(() => {
    if (talhaoQuery && TALHOES_MOCK_DATA.some((t) => t.id === talhaoQuery)) {
      setSelectedTalhaoId(talhaoQuery);
    }
  }, [talhaoQuery]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentAmostra =
    TALHOES_MOCK_DATA.find((t) => t.id === selectedTalhaoId) || TALHOES_MOCK_DATA[0];
  const metrics = computeFieldMetrics(currentAmostra);

  const handleOpenFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isJpgOrPng =
      fileName.endsWith(".jpg") ||
      fileName.endsWith(".jpeg") ||
      fileName.endsWith(".png") ||
      file.type === "image/jpeg" ||
      file.type === "image/png";

    if (!isJpgOrPng) {
      toast.error("Erro: Apenas formatos JPG e PNG são permitidos", {
        position: "top-right",
        autoClose: 4500,
        theme: "dark",
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploadLoading(true);

    const localPreviewUrl = URL.createObjectURL(file);
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
      if (result.detections) {
        setActiveDetections(result.detections);
      }
      setIsModalOpen(true);

      const weedCount = result.summary?.total_ervas_daninhas ?? (result.detections ? result.detections.filter(d => d.type !== 'cana_de_acucar').length : 0);
      toast.success(`Análise concluída: ${weedCount} focos de ervas daninhas identificados!`, {
        position: "top-right",
        autoClose: 4000,
        theme: "dark",
      });
    } catch (err: unknown) {
      console.error("Erro durante o upload da imagem de campo:", err);
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Não foi possível conectar ao servidor backend (http://localhost:8000).";

      toast.error(`Erro: ${errorMsg}`, {
        position: "top-right",
        autoClose: 5000,
        theme: "dark",
      });
    } finally {
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
      {/* ── Tela de Carregamento (Loading) ── */}
      {uploadLoading && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
          }}
        >
          <svg
            style={{
              animation: "spin 1s linear infinite",
              width: "48px",
              height: "48px",
              color: "var(--accent-green)",
            }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <div
            style={{
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Enviando para o servidor... Aguarde.
          </div>
        </div>
      )}

      {/* ── Toast Container ── */}
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

      {/* ── Input Oculto de Arquivo ── */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        style={{ display: "none" }}
        id="field-file-input"
      />

      {/* ── Modal de Detalhes da Captura ── */}
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
                    Nova Foto de Campo Enviada
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0 0" }}>
                    Imagem processada para detecção de plantas daninhas
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
                <span style={{ color: "var(--muted)" }}>Tamanho do Arquivo:</span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{formatFileSize(uploadSuccessData.backend.size_bytes)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Ervas Daninhas (best.pt):</span>
                <span style={{ fontWeight: 700, color: "#f85149" }}>
                  {uploadSuccessData.backend.summary?.total_ervas_daninhas ?? (uploadSuccessData.backend.detections ? uploadSuccessData.backend.detections.filter(d => d.type !== 'cana_de_acucar').length : 0)} focos identificados
                </span>
              </div>
              {uploadSuccessData.backend.summary?.taxa_infestacao_percent !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--muted)" }}>Taxa de Infestação Estimada:</span>
                  <span style={{ fontWeight: 700, color: uploadSuccessData.backend.summary.taxa_infestacao_percent > 20 ? "#f85149" : "#d29922" }}>
                    {uploadSuccessData.backend.summary.taxa_infestacao_percent.toFixed(1)}%
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Status da Análise:</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-green)" }} />
                  Detecção YOLO best.pt Concluída
                </span>
              </div>
            </div>

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
                Enviar Outra Foto
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

      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(true)}
      />

      {/* ── Main content ── */}
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
              aria-label="Expandir menu lateral"
            >
              <IconMenu className="w-5 h-5" />
            </button>
          )}

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
              Inspeção Visual & Detecção de Ervas Daninhas
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "3px 0 0 0",
                lineHeight: 1,
              }}
            >
              Visão computacional e identificação de matocompetição em cana-de-açúcar
            </p>
          </div>

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

          <button
            id="btn-nova-captura"
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
          >
            <IconPlus className="w-4 h-4" />
            Nova Análise de Campo
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
          {/* Seletor de Amostra */}
          <div
            className="fade-in-up"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
              Amostra Ativa:
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

          {/* ── 📊 4 CARDS COM MÉTRICAS REAIS EM m² E % ───────────── */}
          {(() => {
            const hasModelData = Boolean(uploadSuccessData?.backend?.summary);
            const modelSummary = uploadSuccessData?.backend?.summary;
            const modelDetections = activeDetections;

            const taxaInfestacao = modelSummary?.taxa_infestacao_percent ?? metrics.percentualInfestacao;
            const totalFocos = modelSummary?.total_ervas_daninhas ?? (modelDetections ? modelDetections.filter(d => d.type !== 'cana_de_acucar').length : metrics.totalFocos);
            const taxaSaudavel = Math.max(0, 100 - taxaInfestacao);

            return (
              <div
                className="fade-in-up"
                style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
              >
                <StatCard
                  label="Área Amostrada"
                  value={formatNumberBR(metrics.totalFotoM2, 1)}
                  unit="m²"
                  subtitle="Enquadramento aproximado"
                  badge={hasModelData ? "best.pt Ativo" : "100% Foto"}
                  badgeType="info"
                  color="#58a6ff"
                  icon={IconScan}
                  percentage={100}
                />
                <StatCard
                  label="Taxa de Infestação"
                  value={formatNumberBR(taxaInfestacao, 1)}
                  unit="%"
                  subtitle={hasModelData ? `Cálculo via rede YOLO best.pt` : `${formatNumberBR(metrics.infestacaoM2, 2)} m² de daninhas`}
                  badge={`${formatNumberBR(taxaInfestacao, 1)}% Matocompetição`}
                  badgeType={taxaInfestacao > 20 ? "danger" : "warning"}
                  color={taxaInfestacao > 20 ? "#f85149" : "#d29922"}
                  icon={IconAlert}
                  percentage={taxaInfestacao}
                />
                <StatCard
                  label="Cana Saudável"
                  value={formatNumberBR(taxaSaudavel, 1)}
                  unit="%"
                  subtitle={hasModelData ? "Área livre de ervas daninhas" : `${formatNumberBR(metrics.canaSaudavelM2, 2)} m² livres de mato`}
                  badge="Área Útil"
                  badgeType="success"
                  color="var(--accent-green)"
                  icon={IconLeaf}
                  percentage={taxaSaudavel}
                />
                <StatCard
                  label="Ervas Identificadas"
                  value={String(totalFocos)}
                  unit="focos"
                  subtitle={hasModelData ? `Identificadas pelo modelo best.pt` : `Confiança IA: ${formatNumberBR(metrics.mediaConfianca, 0)}%`}
                  badge={totalFocos > 2 ? "Infestação Moderada" : "Baixa Infestação"}
                  badgeType={totalFocos > 2 ? "warning" : "success"}
                  color="#ffa657"
                  icon={IconChart}
                />
              </div>
            );
          })()}

          {/* ── Box da Imagem Central com Caixas Delimitadoras ── */}
          <div
            style={{
              flex: 1,
              minHeight: "420px",
              borderRadius: "12px",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <ImageDetectionViewer
              imageSrc={uploadSuccessData?.localPreview || "/cana_teste.jpg"}
              detections={activeDetections}
            />
          </div>


          {/* ── Faixa de Informações Agronômicas da Amostra ───────────── */}
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
                title: currentAmostra.cultura,
                desc: `${currentAmostra.variedade} — ${formatNumberBR(metrics.totalFotoM2, 1)} m²`,
              },
              {
                icon: "📷",
                title: "Captura de Campo",
                desc: `${currentAmostra.dataCaptura} às 07:14`,
              },
              {
                icon: "📍",
                title: "Localização",
                desc: currentAmostra.cidade,
              },
              {
                icon: "🌿",
                title: "Recomendação Técnica",
                desc: `Aplicação seletiva / catação nos ${formatNumberBR(metrics.infestacaoM2, 2)} m² afetados`,
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

      {/* Style tag para a animação do spinner */}
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
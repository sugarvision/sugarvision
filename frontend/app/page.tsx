"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ToastContainer, toast } from "react-toastify";
import {
  Sidebar,
  IconChart,
  IconAlert,
  IconLeaf,
  IconX,
  IconPlus,
  IconMenu,
  IconUploadCloud,
  IconFileImage,
  IconScan,
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

// ── Stat Card (Métricas da análise de detecção) ──────────────────────────────
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

function calculateMarkedAreaPercent(detections: WeedDetection[]): number {
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const boxes = detections
    .map(({ box }) => ({
      left: clamp(box.x),
      right: clamp(box.x + box.width),
      top: clamp(box.y),
      bottom: clamp(box.y + box.height),
    }))
    .filter((box) => box.right > box.left && box.bottom > box.top);
  const xEdges = Array.from(new Set(boxes.flatMap((box) => [box.left, box.right]))).sort((a, b) => a - b);
  let coveredArea = 0;

  for (let index = 0; index < xEdges.length - 1; index += 1) {
    const left = xEdges[index];
    const right = xEdges[index + 1];
    const intervals = boxes
      .filter((box) => box.left < right && box.right > left)
      .map((box) => [box.top, box.bottom] as const)
      .sort((first, second) => first[0] - second[0]);

    if (intervals.length === 0) continue;

    let intervalStart = intervals[0][0];
    let intervalEnd = intervals[0][1];
    let coveredHeight = 0;

    for (const [top, bottom] of intervals.slice(1)) {
      if (top <= intervalEnd) {
        intervalEnd = Math.max(intervalEnd, bottom);
      } else {
        coveredHeight += intervalEnd - intervalStart;
        intervalStart = top;
        intervalEnd = bottom;
      }
    }

    coveredHeight += intervalEnd - intervalStart;
    coveredArea += (right - left) * coveredHeight;
  }

  return Math.min(100, coveredArea / 100);
}

function calculateMeanConfidence(detections: WeedDetection[]): number | null {
  if (detections.length === 0) return null;
  return (detections.reduce((total, detection) => total + detection.confidence, 0) / detections.length) * 100;
}

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
  const [isViewingSavedHistory, setIsViewingSavedHistory] = useState(false);

  const [selectedTalhaoId, setSelectedTalhaoId] = useState<string>("talhao-01-rio-claro");

  const searchParams = useSearchParams();
  const talhaoQuery = searchParams.get("talhao");
  const amostraQuery = searchParams.get("amostra");
  const analiseIdQuery = searchParams.get("analise_id"); // ID da análise já salva
  const timestampQuery = searchParams.get("t");

  // Trava para evitar que o React Strict Mode faça chamadas duplas
  const processedParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (talhaoQuery && TALHOES_MOCK_DATA.some((t) => t.id === talhaoQuery)) {
      setSelectedTalhaoId(talhaoQuery);
    }
  }, [talhaoQuery]);

  // EFEITO: Trata tanto a visualização do histórico quanto a nova inferência de amostra
  useEffect(() => {
    // 1. CASO A: Usuário veio do Histórico para "Ver Detecção" (Não reprocessa IA!)
    if (analiseIdQuery) {
      if (processedParamRef.current === `hist-${analiseIdQuery}`) return;
      processedParamRef.current = `hist-${analiseIdQuery}`;

      async function loadSavedAnalysis(id: string) {
        setUploadLoading(true);
        try {
          const res = await fetch(`http://127.0.0.1:8000/api/historico/${encodeURIComponent(id)}`);
          if (!res.ok) throw new Error("Análise não encontrada no banco");
          const data = await res.json();

          const imgUrl = data.image_url || `http://127.0.0.1:8000/temp_images/${data.nome_imagem}`;
          const detections = data.detections || [];
          const weedCount = data.focos_detectados ?? detections.length;

          setUploadSuccessData({
            backend: {
              status: "success",
              message: "Análise recuperada do histórico",
              filename: data.nome_imagem,
              original_filename: data.nome_imagem,
              content_type: "image/jpeg",
              size_bytes: 0,
              saved_path: "",
              detections: detections,
              summary: {
                total_ervas_daninhas: weedCount,
                taxa_infestacao_percent: data.percentual_infestacao || 0,
                area_infestada_m2: data.area_infestacao_m2 || 0,
              },
            },
            localPreview: imgUrl,
          });

          setActiveDetections(detections);
          setIsViewingSavedHistory(true);

          toast.info(`Exibindo análise salva: ${data.nome_imagem} (${weedCount} cabeças detectadas)`, {
            position: "top-right",
            autoClose: 3500,
            theme: "dark",
          });
        } catch (err: any) {
          console.error("Erro ao carregar análise salva:", err);
          toast.error("Não foi possível carregar a análise do histórico.");
        } finally {
          setUploadLoading(false);
        }
      }

      loadSavedAnalysis(analiseIdQuery);
      return;
    }

    // 2. CASO B: Usuário veio de "Banco de Amostras" para fazer uma NOVA análise
    if (amostraQuery) {
      const currentCallKey = `amostra-${amostraQuery}-${timestampQuery || ""}`;
      if (processedParamRef.current === currentCallKey) return;
      processedParamRef.current = currentCallKey;

      async function loadAndInferSample(filename: string) {
        setUploadLoading(true);
        setIsViewingSavedHistory(false);
        try {
          let response: Response | null = null;
          try {
            response = await fetch(
              `http://127.0.0.1:8000/api/analyze-sample?filename=${encodeURIComponent(filename)}`
            );
          } catch {
            response = await fetch(
              `http://localhost:8000/api/analyze-sample?filename=${encodeURIComponent(filename)}`
            );
          }

          if (!response.ok) {
            throw new Error(`Erro ${response.status} ao processar a amostra`);
          }

          const result: BackendUploadResponse = await response.json();

          let rawPreviewUrl =
            (result as any).image_url || `http://127.0.0.1:8000/temp_images/${filename}`;

          if (rawPreviewUrl.startsWith("http://localhost:8000")) {
            rawPreviewUrl = rawPreviewUrl.replace("http://localhost:8000", "http://127.0.0.1:8000");
          }

          const cacheBuster = `cb=${Date.now()}`;
          const previewUrl = rawPreviewUrl.includes("?")
            ? `${rawPreviewUrl}&${cacheBuster}`
            : `${rawPreviewUrl}?${cacheBuster}`;

          setUploadSuccessData({
            backend: result,
            localPreview: previewUrl,
          });

          if (result.detections) {
            setActiveDetections(result.detections);
          }

          setIsModalOpen(true);

          const wheatCount =
            result.summary?.total_ervas_daninhas ??
            (result.detections
              ? result.detections.filter((d) => d.type !== "cana_de_acucar").length
              : 0);

          toast.success(
            `Amostra '${filename}' analisada: ${wheatCount} espigas de trigo identificadas!`,
            {
              position: "top-right",
              autoClose: 4500,
              theme: "dark",
            }
          );
        } catch (err: any) {
          console.error("Falha ao analisar amostra selecionada:", err);
          toast.error(`Falha ao inferir na amostra: ${err.message}`, {
            position: "top-right",
            autoClose: 4000,
            theme: "dark",
          });
        } finally {
          setUploadLoading(false);
        }
      }

      loadAndInferSample(amostraQuery);
    }
  }, [amostraQuery, analiseIdQuery, timestampQuery]);

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
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploadLoading(true);
    setIsViewingSavedHistory(false);

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
        } catch {}
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

      const weedCount =
        result.summary?.total_ervas_daninhas ??
        (result.detections ? result.detections.filter((d) => d.type !== "cana_de_acucar").length : 0);

      toast.success(`Análise concluída: ${weedCount} cabeças de trigo identificadas!`, {
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
            {analiseIdQuery ? "Carregando análise salva do histórico..." : "Processando imagem com IA... Aguarde."}
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
                    Foto de Campo Processada
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0 0" }}>
                    Detecção e contagem de cabeças de trigo
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
                  Arquivo:
                </span>
                <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{uploadSuccessData.backend.original_filename}</span>
              </div>
              {uploadSuccessData.backend.size_bytes > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--muted)" }}>Tamanho do Arquivo:</span>
                  <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{formatFileSize(uploadSuccessData.backend.size_bytes)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--muted)" }}>Cabeças de Trigo:</span>
                <span style={{ fontWeight: 700, color: "#f85149" }}>
                  {uploadSuccessData.backend.summary?.total_ervas_daninhas ?? (uploadSuccessData.backend.detections ? uploadSuccessData.backend.detections.filter(d => d.type !== 'cana_de_acucar').length : 0)} cabeças identificadas
                </span>
              </div>
              {uploadSuccessData.backend.detections !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "8px" }}>
                  <span style={{ color: "var(--muted)" }}>Área marcada pelas caixas:</span>
                  <span style={{ fontWeight: 700, color: "#58a6ff" }}>
                    {formatNumberBR(calculateMarkedAreaPercent(uploadSuccessData.backend.detections.filter((d) => d.type !== "cana_de_acucar")), 1)}%
                  </span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Status da Análise:</span>
                <span style={{ color: "var(--accent-green)", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-green)" }} />
                  Detecção Concluída e Registrada
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
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
                Fechar Detalhes
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
              Inspeção Visual & Detecção de Cabeças de Trigo
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "3px 0 0 0",
                lineHeight: 1,
              }}
            >
              {isViewingSavedHistory ? "Visualizando análise salva no Histórico (Modo Leitura)" : "Visão computacional e contagem de cabeças de trigo"}
            </p>
          </div>

          {isViewingSavedHistory && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "20px",
                background: "rgba(88, 166, 255, 0.15)",
                border: "1px solid rgba(88, 166, 255, 0.3)",
                fontSize: "11.5px",
                color: "#58a6ff",
                fontWeight: 600,
              }}
            >
              📁 Visualização do Histórico
            </div>
          )}

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
          {/* ── 📊 4 CARDS COM MÉTRICAS OFICIAIS DE TRIGO ───────────── */}
          {(() => {
            const hasModelData = Boolean(uploadSuccessData);
            const modelSummary = uploadSuccessData?.backend?.summary;
            const modelDetections = uploadSuccessData?.backend?.detections ?? activeDetections;
            const headDetections = modelDetections?.filter((d) => d.type !== "cana_de_acucar");
            const totalEspigas = modelSummary?.total_ervas_daninhas ?? headDetections?.length ?? 0;
            const meanConfidence = headDetections ? calculateMeanConfidence(headDetections) : null;

            // Densidade estimada de espigas com base na contagem e área aproximada
            const densidadeEstimada = totalEspigas > 0
              ? `${(totalEspigas / (currentAmostra.areaAmostraM2 || 2.5)).toFixed(1)} espigas/m²`
              : "—";

            const densidadeClassificacao = totalEspigas === 0
              ? "Sem leitura"
              : totalEspigas < 20
              ? "Densidade Baixa"
              : totalEspigas <= 60
              ? "Densidade Média"
              : "Alta Densidade";

            const statusAnalise = hasModelData ? "Concluída" : "Aguardando";

            return (
              <div
                className="dashboard-metrics-grid fade-in-up"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "12px",
                  width: "100%",
                }}
              >
                {/* 1. Total de Espigas */}
                <StatCard
                  label="Total de Espigas"
                  value={String(totalEspigas)}
                  unit="espigas"
                  subtitle={hasModelData ? "Espigas de trigo detectadas" : "Selecione uma imagem para analisar"}
                  badge={totalEspigas > 0 ? "Detectadas" : "Aguardando"}
                  badgeType={totalEspigas > 0 ? "success" : "neutral"}
                  color="#ffa657"
                  icon={IconLeaf}
                />

                {/* 2. Densidade Estimada */}
                <StatCard
                  label="Densidade Estimada"
                  value={totalEspigas > 0 ? (totalEspigas / (currentAmostra.areaAmostraM2 || 2.5)).toFixed(1) : "—"}
                  unit={totalEspigas > 0 ? "esp/m²" : ""}
                  subtitle={totalEspigas > 0 ? densidadeEstimada : "Calculada por enquadramento de campo"}
                  badge={densidadeClassificacao}
                  badgeType={totalEspigas > 60 ? "warning" : totalEspigas > 0 ? "success" : "neutral"}
                  color="#3fb950"
                  icon={IconChart}
                />

                {/* 3. Confiança Média */}
                <StatCard
                  label="Confiança Média"
                  value={meanConfidence === null ? "—" : formatNumberBR(meanConfidence, 1)}
                  unit={meanConfidence === null ? "" : "%"}
                  subtitle={hasModelData ? "Acurácia média das detecções" : "Disponível após o processamento"}
                  badge={hasModelData ? "YOLOv8x" : "Aguardando"}
                  badgeType="info"
                  color="#58a6ff"
                  icon={IconAlert}
                  percentage={meanConfidence ?? undefined}
                />

                {/* 4. Status do Pipeline */}
                <StatCard
                  label="Status do Pipeline"
                  value={statusAnalise}
                  unit=""
                  subtitle={hasModelData ? "IA processada e registrada" : "Pronto para nova captura"}
                  badge={hasModelData ? "Online / Ativo" : "Em espera"}
                  badgeType={hasModelData ? "success" : "neutral"}
                  color={hasModelData ? "#2ea043" : "var(--muted)"}
                  icon={IconScan}
                />
              </div>
            );
          })()}

          {/* ── Box da Imagem Central com Caixas Delimitadoras ── */}
          <div
            className="detection-panel"
            style={{
              flex: 1,
              minHeight: "420px",
              borderRadius: "12px",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              overflow: "hidden",
              position: "relative",
              display: "flex",
            }}
          >
            <div className="detection-image">
              <ImageDetectionViewer
                key={uploadSuccessData?.localPreview || (amostraQuery ? `amostra-${amostraQuery}-${timestampQuery || ''}` : "default")}
                imageSrc={uploadSuccessData?.localPreview || (amostraQuery ? `http://127.0.0.1:8000/temp_images/${amostraQuery}` : undefined)}
                detections={activeDetections}
              />
            </div>
            <aside className="detection-legend" aria-label="Legenda das detecções">
              <h2>Legenda</h2>
              <div className="detection-legend-item">
                <span className="detection-legend-swatch" aria-hidden="true" />
                <span>Espigas de Trigo</span>
              </div>
              <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px", fontSize: "11px", color: "var(--muted)" }}>
                <div>• Classe: <strong>0 (wheat)</strong></div>
                <div>• Modelo: <strong>YOLOv8x</strong></div>
              </div>
              <p className="ai-disclaimer">
                A IA pode cometer erros. Revise as detecções antes de tomar decisões agronômicas.
              </p>
            </aside>
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
                icon: "🌾",
                title: "Cultura Alvo",
                desc: "Trigo (Triticum aestivum)",
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
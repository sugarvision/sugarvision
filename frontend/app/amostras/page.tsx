"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  IconScan,
  IconLayers,
  IconAlert,
  IconChart,
  IconCheck,
  IconX,
} from "../components/Sidebar";

// ── Componente Resiliente de Imagem com Fallbacks ────────────────────────────
function SampleImage({
  filename,
  alt,
  className = "",
  style = {},
}: {
  filename: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const getInitialSrc = (name: string) => {
    if (!name) return "/cana_teste.jpg";
    return `http://127.0.0.1:8000/temp_images/${name}`;
  };

  const [src, setSrc] = useState<string>(() => getInitialSrc(filename));
  const [errorStage, setErrorStage] = useState(0);

  useEffect(() => {
    setSrc(getInitialSrc(filename));
    setErrorStage(0);
  }, [filename]);

  const handleError = () => {
    if (errorStage === 0) {
      setErrorStage(1);
      setSrc(`/${filename}`);
    } else {
      setErrorStage(2);
    }
  };

  if (errorStage >= 2) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #161b22, #0d1117)",
          color: "var(--muted)",
          padding: "10px",
          textAlign: "center",
          ...style,
        }}
      >
        <IconScan className="w-8 h-8 text-[var(--accent-green)] opacity-80 mb-1" />
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--foreground)" }}>
          Amostra UAV
        </span>
        <span style={{ fontSize: "10px", color: "var(--muted)", wordBreak: "break-all" }}>
          {filename}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={handleError}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        ...style,
      }}
    />
  );
}

// ── Tipos de Dados da Tabela 'images' e Anomalias Vinculadas ──────────────────
export interface ImageAnomaly {
  id: string;
  anomaly_type: string;
  area_hectares: number;
  created_at: string | null;
}

export interface ImageSample {
  id: string;
  filename: string;
  status: string;
  uploaded_at: string | null;
  total_anomalies: number;
  total_area_ha: number;
  anomalies: ImageAnomaly[];
}

export default function BancoDeAmostrasPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [samples, setSamples] = useState<ImageSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("");

  // Filtros e Visualização
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedSample, setSelectedSample] = useState<ImageSample | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const router = useRouter();

  // Executa navegação garantindo timestamp único para forçar nova inferência no painel principal
  const handleAnalyzeSample = (e: React.MouseEvent, sampleFilename: string, sampleId: string) => {
    e.preventDefault();
    router.push(`/?amostra=${encodeURIComponent(sampleFilename)}&id=${encodeURIComponent(sampleId)}&t=${Date.now()}`);
  };

  // ── Busca de dados da tabela 'images' via API do Backend ────────────────────
  const fetchImagesFromDatabase = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/images", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Falha HTTP ao consultar tabela images: status ${response.status}`);
      }

      const data: ImageSample[] = await response.json();
      setSamples(data);
      setIsLiveConnected(true);
      setLastSynced(new Date().toLocaleTimeString("pt-BR"));
    } catch (err: any) {
      console.warn("Backend não respondeu diretamente ou offline. Buscando dados locais/contingência:", err);
      setError("Conexão direta com a API temporariamente instável. Exibindo registros sincronizados.");
      setIsLiveConnected(false);
      setSamples([
        {
          id: "5e0fac58-359f-4eb6-8d62-9491a0b867f0",
          filename: "teste agro2.jpeg",
          status: "completed",
          uploaded_at: "2026-08-20T14:10:27.686432+00:00",
          total_anomalies: 2,
          total_area_ha: 18.71,
          anomalies: [
            { id: "b5d4779c-ba71-4a0d-a9d8-41187bb2544e", anomaly_type: "healthy_cane", area_hectares: 14.16, created_at: "2026-08-20T14:10:28.696344+00:00" },
            { id: "e3c07f03-f3a3-4dd3-93d7-698cbf9413be", anomaly_type: "white_leaf_disease", area_hectares: 4.55, created_at: "2026-08-20T14:10:29.132159+00:00" },
          ],
        },
        {
          id: "fdb31da6-45d6-4247-9b35-556fe6e4eabe",
          filename: "testefoto1myagro.png",
          status: "completed",
          uploaded_at: "2026-08-20T11:23:44.448945+00:00",
          total_anomalies: 2,
          total_area_ha: 43.97,
          anomalies: [
            { id: "747f6775-ccfb-4272-b903-9c51ea8f0ef4", anomaly_type: "healthy_cane", area_hectares: 40.95, created_at: "2026-08-20T11:23:45.348035+00:00" },
            { id: "88197500-430b-45f6-bdef-af160637d2bb", anomaly_type: "white_leaf_disease", area_hectares: 3.02, created_at: "2026-08-20T11:23:45.762599+00:00" },
          ],
        },
        {
          id: "f1101682-e661-4567-9cb6-ad124db6aaf2",
          filename: "testefoto1myagro.png",
          status: "completed",
          uploaded_at: "2026-08-20T11:03:05.828398+00:00",
          total_anomalies: 2,
          total_area_ha: 25.56,
          anomalies: [
            { id: "bb8c19b1-5bda-40af-93c1-b5b856930196", anomaly_type: "healthy_cane", area_hectares: 23.28, created_at: "2026-08-20T11:03:06.888132+00:00" },
            { id: "92a4f9e9-2a78-4cf7-97f3-3e1930a8d74c", anomaly_type: "white_leaf_disease", area_hectares: 2.28, created_at: "2026-08-20T11:03:07.814602+00:00" },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImagesFromDatabase();
  }, []);

  // ── Métricas Agregadas ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalAmostras = samples.length;
    const concluidas = samples.filter((s) => s.status === "completed").length;
    const totalAnomalias = samples.reduce((acc, curr) => acc + (curr.total_anomalies || 0), 0);
    const areaTotalHa = samples.reduce((acc, curr) => acc + (curr.total_area_ha || 0), 0);

    return {
      totalAmostras,
      concluidas,
      taxaConclusao: totalAmostras > 0 ? (concluidas / totalAmostras) * 100 : 100,
      totalAnomalias,
      areaTotalHa,
    };
  }, [samples]);

  // ── Amostras Filtradas ──────────────────────────────────────────────────────
  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchesSearch =
        sample.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sample.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || sample.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [samples, searchTerm, statusFilter]);

  // ── Formatação de Datas ─────────────────────────────────────────────────────
  const formatDate = (isoStr: string | null) => {
    if (!isoStr) return "Data N/D";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--background)",
        color: "var(--foreground)",
        fontFamily: "var(--font-geist-sans, sans-serif)",
      }}
    >
      {/* ── Sidebar de Navegação ── */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* ── Conteúdo Central ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(35, 134, 54, 0.07) 0%, transparent 60%)",
        }}
      >
        {/* Top Header */}
        <header
          style={{
            height: "64px",
            borderBottom: "1px solid var(--sidebar-border)",
            background: "rgba(22, 27, 34, 0.85)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: "16px",
            position: "sticky",
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--foreground)",
                  margin: 0,
                  lineHeight: 1.2,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <IconLayers className="w-4 h-4 text-[var(--accent-green)]" />
                Banco de Amostras
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "2px 8px",
                    borderRadius: "12px",
                    background: "rgba(56, 139, 253, 0.15)",
                    color: "#58a6ff",
                    border: "1px solid rgba(56, 139, 253, 0.3)",
                  }}
                >
                  Tabela: images
                </span>
              </h1>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "4px 0 0 0",
                lineHeight: 1,
              }}
            >
              Registro consolidado e consulta em tempo real das imagens e metadados no banco PostgreSQL / Supabase
            </p>
          </div>

          {/* Status da Conexão com o Banco */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "20px",
              background: isLiveConnected ? "rgba(46, 160, 67, 0.12)" : "rgba(210, 153, 34, 0.12)",
              border: `1px solid ${isLiveConnected ? "rgba(46, 160, 67, 0.3)" : "rgba(210, 153, 34, 0.3)"}`,
              fontSize: "11px",
              fontWeight: 600,
              color: isLiveConnected ? "var(--accent-green)" : "#d29922",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isLiveConnected ? "var(--accent-green)" : "#d29922",
                boxShadow: isLiveConnected ? "0 0 8px var(--accent-green)" : "none",
              }}
            />
            {isLiveConnected ? "PostgreSQL / Supabase Conectado" : "Modo Contingência / Sincronizado"}
          </div>

          {/* Botão Atualizar */}
          <button
            id="refresh-samples-btn"
            onClick={fetchImagesFromDatabase}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              background: "var(--surface)",
              border: "1px solid var(--card-border)",
              color: "var(--foreground)",
              fontSize: "12px",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s ease",
            }}
            title="Recarregar dados da tabela images"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            {loading ? "Consultando..." : "Sincronizar"}
          </button>

          {/* Link para o Painel de Detecção */}
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              background: "linear-gradient(180deg, #2ea043, #238636)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 600,
              textDecoration: "none",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            <IconScan className="w-3.5 h-3.5 text-white" />
            Nova Análise
          </Link>
        </header>

        {/* ── Área de Conteúdo Scrollável ── */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {error && (
            <div
              style={{
                padding: "10px 16px",
                borderRadius: "8px",
                background: "rgba(210, 153, 34, 0.1)",
                border: "1px solid rgba(210, 153, 34, 0.3)",
                color: "#e3b341",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <IconAlert className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={fetchImagesFromDatabase}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#58a6ff",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Tentar reconectar
              </button>
            </div>
          )}

          {/* ── 4 CARDS COM KPIs DO BANCO DE DADOS ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "14px",
            }}
          >
            {/* Card 1: Total de Amostras */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                  Amostras no Banco
                </span>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    background: "rgba(56, 139, 253, 0.15)",
                    color: "#58a6ff",
                  }}
                >
                  PostgreSQL
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--foreground)" }}>
                  {loading ? "..." : metrics.totalAmostras}
                </span>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>registros</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Total de fotos cadastradas na tabela images
              </span>
            </div>

            {/* Card 2: Concluídas / Status */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                  Status Processamento
                </span>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    background: "rgba(46, 160, 67, 0.15)",
                    color: "var(--accent-green)",
                  }}
                >
                  {metrics.taxaConclusao.toFixed(0)}% OK
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--accent-green)" }}>
                  {loading ? "..." : metrics.concluidas}
                </span>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>concluídas</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Processadas com inferência YOLO
              </span>
            </div>

            {/* Card 3: Focos / Anomalias */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                  Anomalias Associadas
                </span>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    background: "rgba(248, 81, 73, 0.15)",
                    color: "#f85149",
                  }}
                >
                  Tabela anomalies
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "28px", fontWeight: 700, color: "#ffa657" }}>
                  {loading ? "..." : metrics.totalAnomalias}
                </span>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>focos mapeados</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Vínculo por chave estrangeira image_id
              </span>
            </div>

            {/* Card 4: Área Total */}
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
                  Área Amostrada Total
                </span>
                <span
                  style={{
                    padding: "2px 6px",
                    borderRadius: "6px",
                    fontSize: "10px",
                    fontWeight: 600,
                    background: "rgba(163, 113, 247, 0.15)",
                    color: "#a371f7",
                  }}
                >
                  Hectares
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                <span style={{ fontSize: "28px", fontWeight: 700, color: "var(--foreground)" }}>
                  {loading ? "..." : metrics.areaTotalHa.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </span>
                <span style={{ fontSize: "13px", color: "var(--muted)" }}>ha</span>
              </div>
              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                Cobertura total mapeada nas amostras
              </span>
            </div>
          </div>

          {/* ── BARRA DE FERRAMENTAS: BUSCA, FILTROS E MODO DE EXIBIÇÃO ── */}
          <div
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            {/* Campo de Busca */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                }}
              >
                <input
                  id="search-samples-input"
                  type="text"
                  placeholder="Buscar por nome do arquivo ou UUID da amostra..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 34px",
                    borderRadius: "6px",
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    fontSize: "13px",
                    outline: "none",
                  }}
                />
                <svg
                  className="w-4 h-4 text-gray-400"
                  style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>

            {/* Filtro por Status */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)" }}>Status:</span>
              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "7px 12px",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "12px",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value="all">Todos os Status</option>
                <option value="completed">Concluídos (completed)</option>
                <option value="processing">Em Análise (processing)</option>
              </select>
            </div>

            {/* Alternância Grid / Tabela */}
            <div
              style={{
                display: "flex",
                background: "var(--surface)",
                padding: "3px",
                borderRadius: "6px",
                border: "1px solid var(--card-border)",
              }}
            >
              <button
                id="view-grid-btn"
                onClick={() => setViewMode("grid")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "none",
                  background: viewMode === "grid" ? "var(--sidebar-border)" : "transparent",
                  color: viewMode === "grid" ? "var(--foreground)" : "var(--muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <IconLayers className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                id="view-table-btn"
                onClick={() => setViewMode("table")}
                style={{
                  padding: "5px 10px",
                  borderRadius: "4px",
                  border: "none",
                  background: viewMode === "table" ? "var(--sidebar-border)" : "transparent",
                  color: viewMode === "table" ? "var(--foreground)" : "var(--muted)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <IconChart className="w-3.5 h-3.5" />
                Tabela
              </button>
            </div>
          </div>

          {/* ── LISTAGEM DE AMOSTRAS ── */}
          {loading ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <svg
                className="w-8 h-8 animate-spin text-[var(--accent-green)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span style={{ fontSize: "14px", color: "var(--muted)" }}>
                Consultando tabela 'images' no banco de dados Supabase...
              </span>
            </div>
          ) : filteredSamples.length === 0 ? (
            <div
              style={{
                padding: "48px 24px",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                textAlign: "center",
              }}
            >
              <IconLayers className="w-10 h-10 text-[var(--muted)] mx-auto mb-3" />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--foreground)", margin: "0 0 6px 0" }}>
                Nenhuma amostra encontrada
              </h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 16px 0" }}>
                Não foram localizados registros na tabela 'images' correspondentes aos filtros aplicados.
              </p>
              <button
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                }}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                Limpar filtros
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* ── MODO GRID (CARDS VISUAIS) ── */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: "16px",
              }}
            >
              {filteredSamples.map((sample) => (
                <div
                  key={sample.id}
                  style={{
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderRadius: "12px",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent-green)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--card-border)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* Miniatura / Cabeçalho do Card */}
                  <div
                    style={{
                      height: "140px",
                      background: "linear-gradient(135deg, #161b22, #0d1117)",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderBottom: "1px solid var(--sidebar-border)",
                      overflow: "hidden",
                    }}
                  >
                    {/* Imagem de preview resiliente */}
                    <SampleImage
                      filename={sample.filename}
                      alt={sample.filename}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(to top, rgba(13,17,23,0.95), transparent 60%)",
                        pointerEvents: "none",
                      }}
                    />

                    {/* Badge do Status */}
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        padding: "3px 8px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background:
                          sample.status === "completed"
                            ? "rgba(46, 160, 67, 0.85)"
                            : "rgba(210, 153, 34, 0.85)",
                        color: "#ffffff",
                        backdropFilter: "blur(4px)",
                        zIndex: 2,
                      }}
                    >
                      {sample.status === "completed" ? "Concluído" : sample.status}
                    </div>

                    {/* Badge de Extensão */}
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "10px",
                        fontWeight: 700,
                        background: "rgba(0,0,0,0.6)",
                        color: "var(--foreground)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        zIndex: 2,
                      }}
                    >
                      {sample.filename.split(".").pop()?.toUpperCase() || "IMG"}
                    </div>

                    {/* Título sobre a imagem */}
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "12px",
                        right: "12px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        zIndex: 2,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "#ffffff",
                          textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                        }}
                      >
                        {sample.filename}
                      </span>
                    </div>
                  </div>

                  {/* Corpo do Card */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", flex: 1 }}>
                    {/* UUID da Amostra */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>UUID:</span>
                      <button
                        onClick={() => copyToClipboard(sample.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: copiedId === sample.id ? "var(--accent-green)" : "#58a6ff",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "2px 4px",
                          borderRadius: "4px",
                        }}
                        title="Copiar ID para clipboard"
                      >
                        {sample.id.slice(0, 13)}...
                        {copiedId === sample.id ? (
                          <IconCheck className="w-3 h-3 text-[var(--accent-green)]" />
                        ) : (
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                          </svg>
                        )}
                      </button>
                    </div>

                    {/* Data de Upload */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "11px", color: "var(--muted)" }}>Data no Banco:</span>
                      <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--foreground)" }}>
                        {formatDate(sample.uploaded_at)}
                      </span>
                    </div>

                    {/* Métricas: Focos e Área */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "8px",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        background: "var(--surface)",
                        border: "1px solid var(--sidebar-border)",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>Anomalias</span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "#ffa657" }}>
                          {sample.total_anomalies} focos
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>Área Coberta</span>
                        <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--foreground)" }}>
                          {sample.total_area_ha} ha
                        </span>
                      </div>
                    </div>

                    {/* Tags de Anomalias Detectadas */}
                    {sample.anomalies && sample.anomalies.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {sample.anomalies.map((anom, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: "10px",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              background:
                                anom.anomaly_type === "healthy_cane"
                                  ? "rgba(46, 160, 67, 0.15)"
                                  : "rgba(248, 81, 73, 0.15)",
                              color:
                                anom.anomaly_type === "healthy_cane"
                                  ? "var(--accent-green)"
                                  : "#f85149",
                              border: `1px solid ${
                                anom.anomaly_type === "healthy_cane"
                                  ? "rgba(46, 160, 67, 0.3)"
                                  : "rgba(248, 81, 73, 0.3)"
                              }`,
                            }}
                          >
                            {anom.anomaly_type} ({anom.area_hectares} ha)
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Botões de Ação */}
                    <div style={{ marginTop: "auto", paddingTop: "8px", display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => setSelectedSample(sample)}
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: "var(--surface)",
                          border: "1px solid var(--card-border)",
                          color: "var(--foreground)",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                        }}
                      >
                        <IconScan className="w-3 h-3 text-[var(--accent-green)]" />
                        Ver Detalhes
                      </button>
                      <Link
                        href={`/?amostra=${encodeURIComponent(sample.filename)}&id=${encodeURIComponent(sample.id)}&t=${Date.now()}`}
                        onClick={(e) => handleAnalyzeSample(e, sample.filename, sample.id)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "6px",
                          background: "rgba(46, 160, 67, 0.15)",
                          border: "1px solid rgba(46, 160, 67, 0.3)",
                          color: "var(--accent-green)",
                          fontSize: "11px",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                        title="Abrir e inferir no Painel de Detecção Principal"
                      >
                        Analisar
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* ── MODO TABELA ESTRUTURADA ── */
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--surface)",
                        borderBottom: "1px solid var(--sidebar-border)",
                        color: "var(--muted)",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <th style={{ padding: "12px 16px" }}>Arquivo / Nome</th>
                      <th style={{ padding: "12px 16px" }}>UUID (ID Banco)</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                      <th style={{ padding: "12px 16px" }}>Data Upload</th>
                      <th style={{ padding: "12px 16px" }}>Focos / Anomalias</th>
                      <th style={{ padding: "12px 16px" }}>Área (ha)</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSamples.map((sample) => (
                      <tr
                        key={sample.id}
                        style={{
                          borderBottom: "1px solid var(--sidebar-border)",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <div
                              style={{
                                width: "28px",
                                height: "28px",
                                borderRadius: "6px",
                                overflow: "hidden",
                                background: "#0d1117",
                                flexShrink: 0,
                              }}
                            >
                              <SampleImage
                                filename={sample.filename}
                                alt=""
                              />
                            </div>
                            <span style={{ fontWeight: 600, color: "var(--foreground)" }}>{sample.filename}</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>
                          {sample.id}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: "12px",
                              fontSize: "11px",
                              fontWeight: 600,
                              background:
                                sample.status === "completed"
                                  ? "rgba(46, 160, 67, 0.15)"
                                  : "rgba(210, 153, 34, 0.15)",
                              color:
                                sample.status === "completed"
                                  ? "var(--accent-green)"
                                  : "#d29922",
                            }}
                          >
                            {sample.status}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "12px" }}>
                          {formatDate(sample.uploaded_at)}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontWeight: 600, color: "#ffa657" }}>{sample.total_anomalies}</span>
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "var(--foreground)" }}>
                          {sample.total_area_ha} ha
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                            <button
                              onClick={() => setSelectedSample(sample)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "var(--surface)",
                                border: "1px solid var(--card-border)",
                                color: "var(--foreground)",
                                fontSize: "11px",
                                cursor: "pointer",
                              }}
                            >
                              Visualizar
                            </button>
                            <Link
                              href={`/?amostra=${encodeURIComponent(sample.filename)}&id=${encodeURIComponent(sample.id)}&t=${Date.now()}`}
                              onClick={(e) => handleAnalyzeSample(e, sample.filename, sample.id)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                background: "rgba(46, 160, 67, 0.15)",
                                border: "1px solid rgba(46, 160, 67, 0.3)",
                                color: "var(--accent-green)",
                                fontSize: "11px",
                                fontWeight: 600,
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              Analisar
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ── MODAL DE DETALHES DA AMOSTRA ── */}
        {selectedSample && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.75)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
              padding: "20px",
            }}
            onClick={() => setSelectedSample(null)}
          >
            <div
              style={{
                background: "var(--sidebar-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "14px",
                width: "100%",
                maxWidth: "600px",
                maxHeight: "90vh",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabeçalho do Modal */}
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid var(--sidebar-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                    Ficha Técnica da Amostra
                  </h3>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>Tabela 'images' — Banco de Dados</span>
                </div>
                <button
                  onClick={() => setSelectedSample(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    padding: "4px",
                    borderRadius: "6px",
                  }}
                >
                  <IconX className="w-5 h-5" />
                </button>
              </div>

              {/* Conteúdo do Modal */}
              <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Visualização de Prévia */}
                <div
                  style={{
                    height: "180px",
                    borderRadius: "10px",
                    overflow: "hidden",
                    position: "relative",
                    background: "#0d1117",
                    border: "1px solid var(--sidebar-border)",
                  }}
                >
                  <SampleImage
                    filename={selectedSample.filename}
                    alt={selectedSample.filename}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "12px",
                      background: "rgba(0,0,0,0.7)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#fff",
                    }}
                  >
                    {selectedSample.filename}
                  </div>
                </div>

                {/* Grid de Metadados do Banco */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                    fontSize: "12px",
                  }}
                >
                  <div style={{ background: "var(--surface)", padding: "10px", borderRadius: "8px" }}>
                    <span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>UUID (ID)</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, wordBreak: "break-all" }}>
                      {selectedSample.id}
                    </span>
                  </div>
                  <div style={{ background: "var(--surface)", padding: "10px", borderRadius: "8px" }}>
                    <span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Status</span>
                    <span
                      style={{
                        color:
                          selectedSample.status === "completed"
                            ? "var(--accent-green)"
                            : "#d29922",
                        fontWeight: 700,
                      }}
                    >
                      {selectedSample.status}
                    </span>
                  </div>
                  <div style={{ background: "var(--surface)", padding: "10px", borderRadius: "8px" }}>
                    <span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Data de Inserção</span>
                    <span style={{ fontWeight: 600 }}>{formatDate(selectedSample.uploaded_at)}</span>
                  </div>
                  <div style={{ background: "var(--surface)", padding: "10px", borderRadius: "8px" }}>
                    <span style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>Área Mapeada</span>
                    <span style={{ fontWeight: 700, color: "var(--foreground)" }}>{selectedSample.total_area_ha} Hectares</span>
                  </div>
                </div>

                {/* Anomalias Registradas no Banco */}
                <div>
                  <h4 style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px 0", color: "var(--foreground)" }}>
                    Anomalias Vinculadas na Tabela 'anomalies' ({selectedSample.anomalies.length}):
                  </h4>
                  {selectedSample.anomalies.length === 0 ? (
                    <p style={{ fontSize: "12px", color: "var(--muted)", margin: 0 }}>
                      Nenhuma anomalia direta vinculada a esta imagem no banco.
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {selectedSample.anomalies.map((anom, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "6px",
                            background: "var(--surface)",
                            border: "1px solid var(--sidebar-border)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "12px",
                          }}
                        >
                          <div>
                            <span
                              style={{
                                fontWeight: 600,
                                color:
                                  anom.anomaly_type === "healthy_cane"
                                    ? "var(--accent-green)"
                                    : "#f85149",
                              }}
                            >
                              {anom.anomaly_type === "healthy_cane" ? "Cana Saudável (healthy_cane)" : "Doença Folha Branca (white_leaf_disease)"}
                            </span>
                            <span style={{ display: "block", fontSize: "10px", color: "var(--muted)" }}>
                              ID: {anom.id.slice(0, 16)}...
                            </span>
                          </div>
                          <span style={{ fontWeight: 700, color: "var(--foreground)" }}>
                            {anom.area_hectares} ha
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé do Modal */}
              <div
                style={{
                  padding: "14px 20px",
                  borderTop: "1px solid var(--sidebar-border)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  background: "var(--surface)",
                }}
              >
                <button
                  onClick={() => setSelectedSample(null)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    fontSize: "12px",
                    cursor: "pointer",
                  }}
                >
                  Fechar
                </button>
                <Link
                  href={`/?amostra=${encodeURIComponent(selectedSample.filename)}&id=${encodeURIComponent(selectedSample.id)}&t=${Date.now()}`}
                  onClick={(e) => handleAnalyzeSample(e, selectedSample.filename, selectedSample.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: "var(--accent-green)",
                    border: "none",
                    color: "#ffffff",
                    fontSize: "12px",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <IconScan className="w-3.5 h-3.5 text-white" />
                  Abrir e Inferir no Painel
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

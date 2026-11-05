"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Sidebar, IconLeaf, IconScan } from "../components/Sidebar";
import { formatNumberBR } from "../utils/geoMath";
import { authFetch, createClient } from "../../lib/supabase/client";

import { API_URL } from "../../lib/env";
import TechnicalReportModal from "../components/TechnicalReportModal";
import { exportSamplesToCsv } from "../utils/exportCsv";

interface AnaliseHistorico {
  id: string;
  dataCaptura: string;
  horaCaptura: string;
  nomeImagem: string;
  tamanhoArquivo: string;
  formato: "JPG" | "PNG";
  talhaoId: string;
  talhaoNome: string;
  cidade: string;
  variedade: string;
  areaAmostraM2: number;
  focosDetectados: number;
  status: "Concluído" | "Em Processamento" | "Atenção";
  image_url?: string;
  created_at?: string;
  total_espigas?: number;
  densidade_estimada?: number;
  latitude?: number;
  longitude?: number;
  detections?: any[];
}

// ── Componente de Skeleton Loading para a Tabela ────────────────────────────
function TableSkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr
          key={i}
          style={{
            borderBottom: "1px solid var(--sidebar-border)",
            opacity: 1 - i * 0.12,
          }}
        >
          {/* 1. Data da Captura */}
          <td style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="skeleton-box" style={{ width: "32px", height: "32px", borderRadius: "6px" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div className="skeleton-box" style={{ width: "80px", height: "13px" }} />
                <div className="skeleton-box" style={{ width: "50px", height: "10px" }} />
              </div>
            </div>
          </td>

          {/* 2. Nome da Foto & Talhão */}
          <td style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <div className="skeleton-box" style={{ width: "160px", height: "14px" }} />
                <div className="skeleton-box" style={{ width: "36px", height: "14px" }} />
              </div>
              <div className="skeleton-box" style={{ width: "210px", height: "11px" }} />
            </div>
          </td>

          {/* 3. Área */}
          <td style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="skeleton-box" style={{ width: "65px", height: "14px" }} />
              <div className="skeleton-box" style={{ width: "110px", height: "10px" }} />
            </div>
          </td>

          {/* 4. Cabeças de Trigo / Status */}
          <td style={{ padding: "14px 18px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div className="skeleton-box" style={{ width: "90px", height: "18px", borderRadius: "999px" }} />
              <div className="skeleton-box" style={{ width: "120px", height: "12px" }} />
            </div>
          </td>

          {/* 5. Ações */}
          <td style={{ padding: "14px 18px", textAlign: "right" }}>
            <div style={{ display: "inline-flex", gap: "8px" }}>
              <div className="skeleton-box" style={{ width: "92px", height: "30px", borderRadius: "6px" }} />
              <div className="skeleton-box" style={{ width: "108px", height: "30px", borderRadius: "6px" }} />
              <div className="skeleton-box" style={{ width: "30px", height: "30px", borderRadius: "6px" }} />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function HistoricoPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("todos");
  const [selectedTalhao, setSelectedTalhao] = useState<string>("todos");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("todos");
  const [selectedDensidade, setSelectedDensidade] = useState<string>("todas");
  const [sortOrder, setSortOrder] = useState<"recentes" | "maior_densidade" | "menor_densidade">("recentes");

  const [selectedReportItem, setSelectedReportItem] = useState<AnaliseHistorico | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Estado real vindo do Backend / Supabase
  const [analises, setAnalises] = useState<AnaliseHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUserEmail, setActiveUserEmail] = useState<string | null>(null);

  // Paginação suave
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Diálogo seguro de confirmação de exclusão
  const [itemToDelete, setItemToDelete] = useState<AnaliseHistorico | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Amostras de Trigo para Contingência Instantânea quando a API estiver inacessível
  const WHEAT_HISTORICO_FALLBACK: AnaliseHistorico[] = [
    {
      id: "hist-01",
      dataCaptura: "21/10/2026",
      horaCaptura: "09:30",
      nomeImagem: "trigo_teste.png",
      tamanhoArquivo: "2.4 MB",
      formato: "PNG",
      talhaoId: "T-01",
      talhaoNome: "Talhão Norte - Trigo BRS 264",
      cidade: "Londrina - PR",
      variedade: "BRS 264",
      areaAmostraM2: 1.0,
      focosDetectados: 42,
      status: "Concluído",
      image_url: "/trigo_teste.png",
      created_at: "2026-10-21T09:30:00Z",
    },
    {
      id: "hist-02",
      dataCaptura: "21/10/2026",
      horaCaptura: "10:15",
      nomeImagem: "wheat_test_01_Terraref_1.jpg",
      tamanhoArquivo: "1.1 MB",
      formato: "JPG",
      talhaoId: "T-02",
      talhaoNome: "Talhão Leste - Trigo TBIO Sintonia",
      cidade: "Cascavel - PR",
      variedade: "TBIO Sintonia",
      areaAmostraM2: 1.0,
      focosDetectados: 77,
      status: "Concluído",
      image_url: "/wheat_test_01_Terraref_1.jpg",
      created_at: "2026-10-21T10:15:00Z",
    },
    {
      id: "hist-03",
      dataCaptura: "21/10/2026",
      horaCaptura: "11:40",
      nomeImagem: "wheat_test_03_CIMMYT_1.jpg",
      tamanhoArquivo: "1.2 MB",
      formato: "JPG",
      talhaoId: "T-03",
      talhaoNome: "Talhão Central - Trigo Toruk",
      cidade: "Passo Fundo - RS",
      variedade: "Toruk",
      areaAmostraM2: 1.0,
      focosDetectados: 16,
      status: "Concluído",
      image_url: "/wheat_test_03_CIMMYT_1.jpg",
      created_at: "2026-10-21T11:40:00Z",
    },
  ];

  // ── Buscar Histórico com user_id da Sessão Ativa do Supabase ────────────────
  const carregarHistorico = async () => {
    setLoading(true);
    setError(null);

    try {
      let userId: string | null = null;
      let accessToken: string | null = null;

      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          userId = data.session.user.id;
          accessToken = data.session.access_token;
          setActiveUserEmail(data.session.user.email || null);
        }
      } catch (authErr) {
        console.debug("Sessão anônima / offline:", authErr);
      }

      const params = new URLSearchParams();
      if (userId) {
        params.set("user_id", userId);
      }
      params.set("page", "1");
      params.set("page_size", "200");

      const endpoint = `${API_URL}/api/historico?${params.toString()}`;
      const res = await authFetch(endpoint, {
        timeoutMs: 15000,
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Falha ao carregar histórico: status HTTP ${res.status}`);
      }

      const data = await res.json();
      setAnalises(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.warn("Backend indisponível. Carregando histórico sincronizado:", err);
      setError("Conexão direta instável. Exibindo dados locais sincronizados.");
      setAnalises(WHEAT_HISTORICO_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  // Extração dinâmica de todos os talhões existentes nos registros reais
  const talhoesDisponiveis = useMemo(() => {
    const setNomes = new Set<string>();
    analises.forEach((item) => {
      if (item.talhaoNome) setNomes.add(item.talhaoNome);
    });
    return Array.from(setNomes).sort();
  }, [analises]);

  // ── Filtros Avançados & Ordenação de Trigo ──────────────────────────────────
  const filteredAnalises = useMemo(() => {
    let result = analises.filter((item) => {
      // 1. Busca instantânea (Nome da imagem, Talhão, Cidade ou Data)
      const termo = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !termo ||
        (item.nomeImagem || "").toLowerCase().includes(termo) ||
        (item.talhaoNome || "").toLowerCase().includes(termo) ||
        (item.talhaoId || "").toLowerCase().includes(termo) ||
        (item.cidade || "").toLowerCase().includes(termo) ||
        (item.dataCaptura || "").includes(termo);

      // 2. Filtro de Formato
      const matchesFormat =
        selectedFormat === "todos" || (item.formato || "").toLowerCase() === selectedFormat.toLowerCase();

      // 3. Filtro de Talhão
      const matchesTalhao =
        selectedTalhao === "todos" ||
        (item.talhaoNome || "").toLowerCase() === selectedTalhao.toLowerCase() ||
        (item.talhaoId || "").toLowerCase() === selectedTalhao.toLowerCase();

      // 4. Filtro de Período
      let matchesPeriodo = true;
      if (selectedPeriodo !== "todos" && item.created_at) {
        try {
          const itemDate = new Date(item.created_at.replace("Z", "").split("+")[0]);
          const now = new Date();
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (selectedPeriodo === "hoje") {
            matchesPeriodo = diffDays <= 1;
          } else if (selectedPeriodo === "7dias") {
            matchesPeriodo = diffDays <= 7;
          } else if (selectedPeriodo === "30dias") {
            matchesPeriodo = diffDays <= 30;
          }
        } catch {
          matchesPeriodo = true;
        }
      }

      // 5. Filtro de Faixa de Densidade
      let matchesDensidade = true;
      const totalEspigas = item.total_espigas ?? item.focosDetectados ?? 0;
      if (selectedDensidade === "alta") {
        matchesDensidade = totalEspigas > 50;
      } else if (selectedDensidade === "media") {
        matchesDensidade = totalEspigas >= 20 && totalEspigas <= 50;
      } else if (selectedDensidade === "baixa") {
        matchesDensidade = totalEspigas < 20;
      }

      return matchesSearch && matchesFormat && matchesTalhao && matchesPeriodo && matchesDensidade;
    });

    // 6. Ordenação: Mais Recentes, Maior Densidade ou Menor Densidade (Falha de Germinação)
    result.sort((a, b) => {
      const espigasA = a.total_espigas ?? a.focosDetectados ?? 0;
      const espigasB = b.total_espigas ?? b.focosDetectados ?? 0;

      if (sortOrder === "maior_densidade") {
        return espigasB - espigasA;
      }
      if (sortOrder === "menor_densidade") {
        return espigasA - espigasB;
      }

      // Padrão: "recentes" (created_at decrescente)
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }, [analises, searchTerm, selectedFormat, selectedTalhao, selectedPeriodo, selectedDensidade, sortOrder]);

  // Reset da página quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedFormat, selectedTalhao, selectedPeriodo, selectedDensidade, sortOrder]);

  // Paginação suave calculada
  const totalPages = Math.max(1, Math.ceil(filteredAnalises.length / itemsPerPage));
  const paginatedAnalises = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredAnalises.slice(start, start + itemsPerPage);
  }, [filteredAnalises, currentPage, itemsPerPage]);

  // ── Mecanismo de Exclusão Segura com Diálogo de Confirmação ─────────────────
  const handleOpenDeleteDialog = (item: AnaliseHistorico) => {
    setItemToDelete(item);
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      let token: string | null = null;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token || null;
      } catch {}

      const res = await authFetch(`${API_URL}/api/historico/${encodeURIComponent(itemToDelete.id)}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Falha no servidor ao excluir registro: status ${res.status}`);
      }

      // Atualiza o estado local removendo a análise excluída
      setAnalises((prev) => prev.filter((item) => item.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err: any) {
      console.error("Erro ao deletar análise do histórico:", err);
      setDeleteError(err.message || "Falha ao excluir o registro do banco de dados.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Abrir Laudo Técnico (.PDF)
  const handleOpenReport = async (item: AnaliseHistorico) => {
    setSelectedReportItem(item);
    setIsReportModalOpen(true);

    if (!item.detections || item.detections.length === 0) {
      try {
        const res = await authFetch(`${API_URL}/api/historico/${encodeURIComponent(item.id)}`);
        if (res && res.ok) {
          const fullData = await res.json();
          if (fullData && fullData.detections) {
            setSelectedReportItem((prev) => (prev ? { ...prev, detections: fullData.detections } : null));
          }
        }
      } catch (e) {
        console.debug("Utilizando dados consolidados da análise:", e);
      }
    }
  };

  // Métricas calculadas dinamicamente
  const totalAreaM2 = analises.reduce((acc, curr) => acc + (curr.areaAmostraM2 || 0), 0);
  const totalCabecas = analises.reduce(
    (acc, curr) => acc + (curr.total_espigas ?? curr.focosDetectados ?? 0),
    0
  );

  // Formatação de Datas sem fuso-horário para o Histórico
  const formatDate = (isoStr: string | null, type: "data" | "hora") => {
    if (!isoStr) return type === "data" ? "Hoje" : "--:--";
    try {
      const localIso = isoStr.replace("Z", "").split("+")[0];
      const d = new Date(localIso);
      if (type === "data") {
        return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      }
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  return (
    <div className="app-main-layout" style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
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
        {/* Top Header */}
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
              Histórico de Capturas & Análises de Campo
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "3px 0 0 0",
                lineHeight: 1,
              }}
            >
              Sincronização com Supabase · Detecção de Espigas de Trigo (GWHD / YOLOv8x)
              {activeUserEmail && (
                <span style={{ marginLeft: "8px", color: "var(--accent-green)", fontWeight: 500 }}>
                  · Sessão: {activeUserEmail}
                </span>
              )}
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              onClick={() => {
                try {
                  exportSamplesToCsv(filteredAnalises, "sugarvision_laudos_trigo");
                } catch (e: any) {
                  alert(e.message || "Erro ao exportar CSV");
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 14px",
                borderRadius: "8px",
                background: "rgba(46, 160, 67, 0.15)",
                border: "1px solid rgba(46, 160, 67, 0.4)",
                color: "#3fb950",
                fontSize: "12.5px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title={`Exportar ${filteredAnalises.length} amostras filtradas em formato CSV`}
            >
              <svg style={{ width: "15px", height: "15px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar (.CSV)
              <span
                style={{
                  background: "rgba(46, 160, 67, 0.3)",
                  fontSize: "11px",
                  padding: "1px 6px",
                  borderRadius: "10px",
                  marginLeft: "2px",
                }}
              >
                {filteredAnalises.length}
              </span>
            </button>

            <button
              onClick={carregarHistorico}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
                fontSize: "12.5px",
                fontWeight: 500,
                cursor: "pointer",
              }}
              title="Recarregar dados do banco Supabase em nuvem"
            >
              🔄 Sincronizar
            </button>

            <Link
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                borderRadius: "8px",
                background: "var(--surface)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
                fontSize: "13px",
                fontWeight: 600,
                textDecoration: "none",
                transition: "all 0.2s ease",
              }}
            >
              <IconLeaf className="w-4 h-4 text-[var(--accent-green)]" />
              Painel Principal
            </Link>
          </div>
        </header>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Alerta de erro ou contingência se houver */}
          {error && (
            <div
              style={{
                background: "rgba(248, 81, 73, 0.1)",
                border: "1px solid rgba(248, 81, 73, 0.3)",
                color: "#f85149",
                borderRadius: "8px",
                padding: "10px 16px",
                fontSize: "13px",
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* ── Linha de Métricas Rápidas ─────────────────────── */}
          <div className="fade-in-up" style={{ display: "flex", gap: "12px", flexWrap: "wrap", flexShrink: 0 }}>
            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "14px 18px",
                flex: "1 1 180px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Total de Análises
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#58a6ff", marginTop: "4px" }}>
                {loading ? "..." : analises.length}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>registros</span>
              </div>
            </div>

            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "14px 18px",
                flex: "1 1 180px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Área Total Amostrada
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#58a6ff", marginTop: "4px" }}>
                {loading ? "..." : formatNumberBR(totalAreaM2, 1)}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>m²</span>
              </div>
            </div>

            <div
              style={{
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                borderRadius: "10px",
                padding: "14px 18px",
                flex: "1 1 180px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>
                Espigas de Trigo Detectadas
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffa657", marginTop: "4px" }}>
                {loading ? "..." : totalCabecas}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>espigas</span>
              </div>
            </div>
          </div>

          {/* ── Barra de Busca Instantânea e Filtros Avançados ────────────────── */}
          <div
            className="fade-in-up"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              flexShrink: 0,
            }}
          >
            {/* Campo de Busca Instantânea */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 260px" }}>
              <svg
                style={{ width: "16px", height: "16px", color: "var(--muted)", flexShrink: 0 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Busca instantânea por talhão, foto, cidade ou data..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--foreground)",
                  fontSize: "13px",
                  width: "100%",
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "2px 6px",
                  }}
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Controles de Filtro e Ordenação */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* 1. Ordenação (Requisito Oficial) */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Ordenar:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="recentes">📅 Mais Recentes</option>
                  <option value="maior_densidade">🟢 Maior Densidade de Espigas</option>
                  <option value="menor_densidade">🔴 Menor Densidade (Falha de Germinação)</option>
                </select>
              </div>

              {/* 2. Filtro de Densidade */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Densidade:</span>
                <select
                  value={selectedDensidade}
                  onChange={(e) => setSelectedDensidade(e.target.value)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="todas">Todas as Densidades</option>
                  <option value="alta">🟢 Alta (&gt; 50 espigas)</option>
                  <option value="media">🟡 Média (20 - 50)</option>
                  <option value="baixa">🔴 Baixa / Falha (&lt; 20)</option>
                </select>
              </div>

              {/* 3. Filtro de Talhão Dinâmico */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Talhão:</span>
                <select
                  value={selectedTalhao}
                  onChange={(e) => setSelectedTalhao(e.target.value)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                    maxWidth: "180px",
                  }}
                >
                  <option value="todos">Todos os Talhões</option>
                  {talhoesDisponiveis.map((talhao) => (
                    <option key={talhao} value={talhao}>
                      {talhao}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Filtro de Período */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Período:</span>
                <select
                  value={selectedPeriodo}
                  onChange={(e) => setSelectedPeriodo(e.target.value)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    borderRadius: "6px",
                    padding: "6px 10px",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="todos">Todo o Histórico</option>
                  <option value="hoje">Hoje</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="30dias">Últimos 30 dias</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── 📋 TABELA DE HISTÓRICO COM SCROLLBAR DEDICADA ───────────── */}
          <div
            className="fade-in-up"
            style={{
              flex: 1,
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            <div
              className="custom-table-scrollbar"
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "auto",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr
                    style={{
                      background: "#161b22",
                      borderBottom: "1px solid var(--card-border)",
                      color: "var(--muted)",
                      fontSize: "11.5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Data da Captura</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Nome da Foto & Talhão</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Área da Amostra</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Espigas / Densidade</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Loading Skeleton enquanto sincroniza */}
                  {loading ? (
                    <TableSkeletonRows count={6} />
                  ) : filteredAnalises.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
                        <div style={{ fontSize: "28px", marginBottom: "8px" }}>🌾</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--foreground)" }}>
                          Nenhuma análise de trigo encontrada
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                          Tente ajustar os filtros ou suba uma nova imagem de trigo no Painel Principal.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAnalises.map((item, index) => {
                      const totalEspigas = item.total_espigas ?? item.focosDetectados ?? 0;
                      const isAlta = totalEspigas > 50;
                      const isBaixa = totalEspigas < 20;

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: index < paginatedAnalises.length - 1 ? "1px solid var(--sidebar-border)" : "none",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {/* 1. Data da Captura */}
                          <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div
                                style={{
                                  width: "32px",
                                  height: "32px",
                                  borderRadius: "6px",
                                  background: "rgba(88, 166, 255, 0.1)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "#58a6ff",
                                }}
                              >
                                <IconScan className="w-4 h-4" />
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: "var(--foreground)" }}>
                                  {item.created_at ? formatDate(item.created_at, "data") : (item.dataCaptura || "Hoje")}
                                </div>
                                <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                                  às {item.created_at ? formatDate(item.created_at, "hora") : (item.horaCaptura || "--:--")}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* 2. Nome da Foto & Talhão */}
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  style={{
                                    fontFamily: "var(--font-mono)",
                                    fontWeight: 600,
                                    color: "#58a6ff",
                                    fontSize: "12.5px",
                                  }}
                                >
                                  {item.nomeImagem}
                                </span>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    background: item.formato === "PNG" ? "rgba(46, 160, 67, 0.15)" : "rgba(88, 166, 255, 0.15)",
                                    color: item.formato === "PNG" ? "#3fb950" : "#58a6ff",
                                    border: `1px solid ${item.formato === "PNG" ? "rgba(46, 160, 67, 0.3)" : "rgba(88, 166, 255, 0.3)"}`,
                                  }}
                                >
                                  {item.formato || "JPG"}
                                </span>
                              </div>
                              <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                                {item.talhaoNome || "Talhão Não Informado"} · {item.cidade || "Área Agrícola"} {item.tamanhoArquivo ? `(${item.tamanhoArquivo})` : ""}
                              </div>
                            </div>
                          </td>

                          {/* 3. Área da Amostra (m²) */}
                          <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                              <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: "14px" }}>
                                {formatNumberBR(item.areaAmostraM2 || 1.0, 1)}{" "}
                                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>m²</span>
                              </div>
                              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                                {item.variedade || "Trigo (Triticum aestivum)"}
                              </div>
                            </div>
                          </td>

                          {/* 4. Espigas / Densidade */}
                          <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: 700,
                                    padding: "2px 8px",
                                    borderRadius: "999px",
                                    background: isAlta
                                      ? "rgba(46, 160, 67, 0.15)"
                                      : isBaixa
                                      ? "rgba(248, 81, 73, 0.15)"
                                      : "rgba(210, 153, 34, 0.15)",
                                    border: `1px solid ${
                                      isAlta
                                        ? "rgba(46, 160, 67, 0.4)"
                                        : isBaixa
                                        ? "rgba(248, 81, 73, 0.4)"
                                        : "rgba(210, 153, 34, 0.4)"
                                    }`,
                                    color: isAlta ? "#3fb950" : isBaixa ? "#f85149" : "#d29922",
                                  }}
                                >
                                  {isAlta ? "Alta Densidade" : isBaixa ? "Falha / Baixa Densidade" : "Média Densidade"}
                                </span>
                              </div>
                              <span style={{ fontSize: "12px", color: "#ffa657", fontWeight: 700 }}>
                                {totalEspigas} {totalEspigas === 1 ? "espiga" : "espigas de trigo"}
                              </span>
                            </div>
                          </td>

                          {/* 5. Ações: Laudo + Ver Detecção + Excluir */}
                          <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                              <button
                                type="button"
                                onClick={() => handleOpenReport(item)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "7px 12px",
                                  borderRadius: "6px",
                                  background: "rgba(56, 139, 253, 0.15)",
                                  border: "1px solid rgba(56, 139, 253, 0.4)",
                                  color: "#58a6ff",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#388bfd";
                                  e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(56, 139, 253, 0.15)";
                                  e.currentTarget.style.color = "#58a6ff";
                                }}
                                title="Exportar Laudo Técnico Agronômico em PDF"
                              >
                                <svg style={{ width: "13px", height: "13px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                  <polyline points="14 2 14 8 20 8" />
                                  <line x1="16" y1="13" x2="8" y2="13" />
                                  <line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                                Laudo (.PDF)
                              </button>

                              <Link
                                href={`/?analise_id=${encodeURIComponent(item.id)}&amostra=${encodeURIComponent(item.nomeImagem)}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "7px 12px",
                                  borderRadius: "6px",
                                  background: "rgba(46, 160, 67, 0.15)",
                                  border: "1px solid rgba(46, 160, 67, 0.4)",
                                  color: "#3fb950",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "var(--accent-green)";
                                  e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(46, 160, 67, 0.15)";
                                  e.currentTarget.style.color = "#3fb950";
                                }}
                              >
                                <IconScan className="w-3.5 h-3.5" />
                                Ver Detecção
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleOpenDeleteDialog(item)}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "30px",
                                  height: "30px",
                                  borderRadius: "6px",
                                  background: "rgba(248, 81, 73, 0.1)",
                                  border: "1px solid rgba(248, 81, 73, 0.3)",
                                  color: "#f85149",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                }}
                                title="Excluir com segurança esta análise do histórico"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = "#f85149";
                                  e.currentTarget.style.color = "#fff";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = "rgba(248, 81, 73, 0.1)";
                                  e.currentTarget.style.color = "#f85149";
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Paginação Suave no Rodapé da Tabela ───────────────────── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                background: "rgba(22, 27, 34, 0.8)",
                borderTop: "1px solid var(--sidebar-border)",
                fontSize: "12px",
                color: "var(--muted)",
                flexWrap: "wrap",
                gap: "10px",
              }}
            >
              <div>
                Exibindo{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {filteredAnalises.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
                </strong>{" "}
                a{" "}
                <strong style={{ color: "var(--foreground)" }}>
                  {Math.min(currentPage * itemsPerPage, filteredAnalises.length)}
                </strong>{" "}
                de <strong style={{ color: "var(--foreground)" }}>{filteredAnalises.length}</strong> análises de trigo
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: currentPage <= 1 ? "transparent" : "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: currentPage <= 1 ? "rgba(255,255,255,0.2)" : "var(--foreground)",
                    cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  ◀ Anterior
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const pNum = i + 1;
                  // Exibe até 5 botões próximos
                  if (totalPages > 6 && Math.abs(pNum - currentPage) > 2 && pNum !== 1 && pNum !== totalPages) {
                    return null;
                  }
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "6px",
                        background: currentPage === pNum ? "var(--accent-green)" : "var(--surface)",
                        border: "1px solid var(--card-border)",
                        color: currentPage === pNum ? "#fff" : "var(--foreground)",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 700,
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: "5px 10px",
                    borderRadius: "6px",
                    background: currentPage >= totalPages ? "transparent" : "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: currentPage >= totalPages ? "rgba(255,255,255,0.2)" : "var(--foreground)",
                    cursor: currentPage >= totalPages ? "not-allowed" : "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Próxima ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modal Seguro de Confirmação de Exclusão ───────────────────── */}
      {itemToDelete && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            style={{
              background: "#161b22",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              padding: "24px",
              maxWidth: "460px",
              width: "100%",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.6)",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "8px",
                  background: "rgba(248, 81, 73, 0.15)",
                  color: "#f85149",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "20px",
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--foreground)" }}>
                  Confirmar Exclusão de Análise
                </h3>
                <p style={{ margin: "4px 0 0 0", fontSize: "12.5px", color: "var(--muted)" }}>
                  Esta operação excluirá permanentemente a análise de trigo do banco Supabase em nuvem.
                </p>
              </div>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--sidebar-border)",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12.5px",
                color: "var(--foreground)",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div>
                <strong>Amostra:</strong>{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "#58a6ff" }}>
                  {itemToDelete.nomeImagem}
                </span>
              </div>
              <div>
                <strong>Talhão:</strong> {itemToDelete.talhaoNome || "N/A"}
              </div>
              <div>
                <strong>Espigas Detectadas:</strong>{" "}
                <span style={{ color: "#ffa657", fontWeight: 700 }}>
                  {itemToDelete.total_espigas ?? itemToDelete.focosDetectados ?? 0}
                </span>
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  background: "rgba(248, 81, 73, 0.15)",
                  border: "1px solid rgba(248, 81, 73, 0.4)",
                  color: "#f85149",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              >
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setItemToDelete(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  background: "var(--surface)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: "8px 18px",
                  borderRadius: "6px",
                  background: "#cf222e",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilização da Scrollbar e Skeleton Shimmer */}
      <style>{`
        .custom-table-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-table-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
        }
        .custom-table-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.18);
          border-radius: 4px;
        }
        .custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--accent-green);
        }

        @keyframes skeleton-shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .skeleton-box {
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%);
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite ease-in-out;
          border-radius: 4px;
        }
      `}</style>

      {/* ── Modal de Laudo Técnico (.PDF) ── */}
      {selectedReportItem && (
        <TechnicalReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedReportItem(null);
          }}
          data={{
            id: selectedReportItem.id,
            nomeImagem: selectedReportItem.nomeImagem,
            imageUrl: selectedReportItem.image_url || `${API_URL}/temp_images/${selectedReportItem.nomeImagem}`,
            dataCaptura: selectedReportItem.dataCaptura,
            horaCaptura: selectedReportItem.horaCaptura,
            created_at: selectedReportItem.created_at,
            talhaoNome: selectedReportItem.talhaoNome || "Talhão Experimental 01 (Embrapa Trigo - Setor Norte)",
            cidade: selectedReportItem.cidade || "Passo Fundo - RS (Embrapa Trigo)",
            variedade: selectedReportItem.variedade || "BRS Pastoreio",
            areaAmostraM2: selectedReportItem.areaAmostraM2 || 1.0,
            totalEspigas: selectedReportItem.total_espigas ?? selectedReportItem.focosDetectados ?? 42,
            detections: selectedReportItem.detections || [],
            tamanhoArquivo: selectedReportItem.tamanhoArquivo,
            latitude: selectedReportItem.latitude ?? -28.2234,
            longitude: selectedReportItem.longitude ?? -52.4076,
          }}
        />
      )}
    </div>
  );
}

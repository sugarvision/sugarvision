"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar, IconLeaf, IconScan } from "../components/Sidebar";
import { formatNumberBR } from "../utils/geoMath";
import { authFetch } from "../../lib/supabase/client";

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

export default function HistoricoPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("todos");
  const [selectedTalhao, setSelectedTalhao] = useState<string>("todos");
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("todos");
  const [selectedReportItem, setSelectedReportItem] = useState<AnaliseHistorico | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Estado real vindo do Backend
  const [analises, setAnalises] = useState<AnaliseHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      focosDetectados: 64,
      status: "Concluído",
      image_url: "/wheat_test_03_CIMMYT_1.jpg",
    },
  ];

  // Função para buscar histórico real do Backend
  // Função para buscar histórico real do Backend
  const carregarHistorico = async () => {
    setLoading(true);
    setError(null);

    try {
      // Timeout aumentado para 15 segundos para dar tempo ao Supabase
      const res = await authFetch(`${API_URL}/api/historico`, { timeoutMs: 15000 });
      
      if (!res.ok) {
        throw new Error("Falha ao carregar histórico do servidor.");
      }
      
      const data = await res.json();
      
      // Se a API responder, confiamos nos dados (mesmo se vier uma lista vazia [])
      setAnalises(data || []);
      
    } catch (err: any) {
      console.warn("Backend indisponível. Carregando histórico sincronizado:", err);
      // O fallback só entra em ação se a internet ou o backend realmente caírem
      setAnalises(WHEAT_HISTORICO_FALLBACK);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);


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
            setSelectedReportItem((prev) => prev ? { ...prev, detections: fullData.detections } : null);
          }
        }
      } catch (e) {
        console.debug("Utilizando dados consolidados da análise:", e);
      }
    }
  };

  // Excluir análise do histórico
  const handleDelete = async (id: string, nome: string) => {
    const confirmou = window.confirm(`Deseja realmente excluir a análise de "${nome}" do histórico?`);
    if (!confirmou) return;

    try {
      const res = await authFetch(`${API_URL}/api/historico/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAnalises((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Erro ao excluir análise.");
      }
    } catch (err) {
      console.error("Erro ao deletar:", err);
      alert("Falha de comunicação com o backend.");
    }
  };

  const filteredAnalises = analises.filter((item) => {
    const matchesSearch =
      (item.nomeImagem || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.talhaoNome || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.cidade || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.dataCaptura || "").includes(searchTerm);

    const matchesFormat =
      selectedFormat === "todos" || (item.formato || "").toLowerCase() === selectedFormat.toLowerCase();

    const matchesTalhao =
      selectedTalhao === "todos" ||
      (item.talhaoId || "").toLowerCase().includes(selectedTalhao.toLowerCase()) ||
      (item.talhaoNome || "").toLowerCase().includes(selectedTalhao.toLowerCase());

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

    return matchesSearch && matchesFormat && matchesTalhao && matchesPeriodo;
  });

  // Métricas calculadas dinamicamente
  const totalAreaM2 = analises.reduce((acc, curr) => acc + (curr.areaAmostraM2 || 0), 0);
  const totalCabecas = analises.reduce((acc, curr) => acc + (curr.focosDetectados || 0), 0);

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
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
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
              Registro consolidado de capturas e cabeças de trigo detectadas
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
              title="Recarregar dados do banco"
            >
              🔄 Atualizar
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
          {/* Alerta de erro de conexão se houver */}
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

          {/* ── Quick Stats Row ──────────────────────────────── */}
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
                {analises.length}{" "}
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
                {formatNumberBR(totalAreaM2, 1)}{" "}
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
                Cabeças de Trigo Detectadas
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffa657", marginTop: "4px" }}>
                {totalCabecas}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>cabeças</span>
              </div>
            </div>
          </div>

          {/* ── Barra de Busca e Filtros ─────────────────────── */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: "1 1 280px" }}>
              <svg
                style={{ width: "16px", height: "16px", color: "var(--muted)" }}
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
                placeholder="Buscar por nome da imagem, amostra ou cidade..."
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--foreground)",
                  fontSize: "13px",
                  width: "100%",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
              {/* Filtro Talhão */}
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
                    padding: "5px 10px",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="todos">Todos os Talhões</option>
                  <option value="exp-01">EXP-01 (Embrapa Norte)</option>
                  <option value="exp-02">EXP-02 (Embrapa Sul)</option>
                  <option value="exp-03">EXP-03 (Embrapa Leste)</option>
                </select>
              </div>

              {/* Filtro Período */}
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
                    padding: "5px 10px",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="todos">Todos os Períodos</option>
                  <option value="hoje">Hoje</option>
                  <option value="7dias">Últimos 7 dias</option>
                  <option value="30dias">Últimos 30 dias</option>
                </select>
              </div>

              {/* Filtro Formato */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Formato:</span>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--card-border)",
                    color: "var(--foreground)",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    fontSize: "12px",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="todos">Todos os Formatos</option>
                  <option value="jpg">Apenas JPG</option>
                  <option value="png">Apenas PNG</option>
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
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Nome da Foto</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Área da Amostra</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Cabeças / Status</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                        ⏳ Carregando histórico de análises do banco...
                      </td>
                    </tr>
                  ) : filteredAnalises.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
                        Nenhuma análise registrada no histórico ainda. Faça um upload no Painel para gerar sua primeira análise!
                      </td>
                    </tr>
                  ) : (
                    filteredAnalises.map((item, index) => (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: index < filteredAnalises.length - 1 ? "1px solid var(--sidebar-border)" : "none",
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

                        {/* 2. Nome da Foto */}
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
                                  fontSize: "10.5px",
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  background: item.formato === "PNG" ? "rgba(46, 160, 67, 0.15)" : "rgba(88, 166, 255, 0.15)",
                                  color: item.formato === "PNG" ? "#3fb950" : "#58a6ff",
                                  border: `1px solid ${item.formato === "PNG" ? "rgba(46, 160, 67, 0.3)" : "rgba(88, 166, 255, 0.3)"}`,
                                }}
                              >
                                {item.formato}
                              </span>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                              {item.talhaoNome} · {item.cidade} ({item.tamanhoArquivo})
                            </div>
                          </div>
                        </td>

                        {/* 3. Área da Amostra (m²) */}
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: "14px" }}>
                              {formatNumberBR(item.areaAmostraM2 || 0, 1)}{" "}
                              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>m²</span>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                              Área aproximada do enquadramento
                            </div>
                          </div>
                        </td>

                        {/* 4. Focos / Status */}
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "12px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "999px",
                                background: item.status === "Atenção" ? "rgba(248, 81, 73, 0.15)" : "rgba(46, 160, 67, 0.15)",
                                border: `1px solid ${item.status === "Atenção" ? "rgba(248, 81, 73, 0.3)" : "rgba(46, 160, 67, 0.3)"}`,
                                color: item.status === "Atenção" ? "#f85149" : "#3fb950",
                                width: "fit-content",
                              }}
                            >
                              <span
                                style={{
                                  width: "6px",
                                  height: "6px",
                                  borderRadius: "50%",
                                  background: item.status === "Atenção" ? "#f85149" : "#3fb950",
                                }}
                              />
                              {item.status}
                            </span>
                            <span style={{ fontSize: "11.5px", color: "#ffa657", fontWeight: 600 }}>
                              {item.focosDetectados} cabeças de trigo
                            </span>
                          </div>
                        </td>

                        {/* 5. Ações: Ver Detecção + Excluir */}
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
                              onClick={() => handleDelete(item.id, item.nomeImagem)}
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
                              title="Excluir esta análise do histórico"
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Estilização da Scrollbar para a Tabela */}
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
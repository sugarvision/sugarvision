"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sidebar, IconLeaf, IconScan } from "../components/Sidebar";
import { formatNumberBR } from "../utils/geoMath";

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
  areaInfestacaoM2: number;
  percentualInfestacao: number;
  focosDetectados: number;
  status: "Concluído" | "Em Processamento" | "Atenção";
  image_url?: string;
}

export default function HistoricoPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("todos");
  
  // Estado real vindo do Backend
  const [analises, setAnalises] = useState<AnaliseHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar histórico real do Backend
  const carregarHistorico = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/api/historico");
      if (!res.ok) {
        throw new Error("Falha ao carregar histórico do servidor.");
      }
      const data = await res.json();
      setAnalises(data);
    } catch (err: any) {
      console.error("Erro ao carregar histórico:", err);
      setError("Não foi possível conectar ao backend. Verifique se o servidor FastAPI está ligado.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarHistorico();
  }, []);

  // Excluir análise do histórico
  const handleDelete = async (id: string, nome: string) => {
    const confirmou = window.confirm(`Deseja realmente excluir a análise de "${nome}" do histórico?`);
    if (!confirmou) return;

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/historico/${id}`, {
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

    return matchesSearch && matchesFormat;
  });

  // Métricas calculadas dinamicamente
  const totalAreaM2 = analises.reduce((acc, curr) => acc + (curr.areaAmostraM2 || 0), 0);
  const totalInfestacaoM2 = analises.reduce((acc, curr) => acc + (curr.areaInfestacaoM2 || 0), 0);
  const mediaInfestacao = totalAreaM2 > 0 ? (totalInfestacaoM2 / totalAreaM2) * 100 : 0;
  const totalFocos = analises.reduce((acc, curr) => acc + (curr.focosDetectados || 0), 0);

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
              Registro consolidado persistente no Supabase de inspeções e detecção de ervas daninhas
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
                Média de Infestação Foliar
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#f85149", marginTop: "4px" }}>
                {formatNumberBR(mediaInfestacao, 1)}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>% da área</span>
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
                Focos Identificados
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#ffa657", marginTop: "4px" }}>
                {totalFocos}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>plantas daninhas</span>
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

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Focos / Status</th>
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
                                {item.dataCaptura || "Hoje"}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                                às {item.horaCaptura || "--:--"}
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
                              {formatNumberBR(item.areaInfestacaoM2 || 0, 2)} m² afetados
                              <span style={{ color: "#f85149", marginLeft: "6px" }}>
                                ({formatNumberBR(item.percentualInfestacao || 0, 1)}% daninhas)
                              </span>
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
                              {item.focosDetectados} focos de ervas
                            </span>
                          </div>
                        </td>

                        {/* 5. Ações: Ver Detecção + Excluir */}
                        <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
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
    </div>
  );
}
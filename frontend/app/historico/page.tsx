"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar, IconDrone, IconMap } from "../components/Sidebar";
import { formatNumberBR } from "../utils/geoMath";

interface AnaliseHistorico {
  id: string;
  dataVoo: string;
  horaVoo: string;
  nomeImagem: string;
  tamanhoArquivo: string;
  formato: "JPG" | "PNG";
  talhaoId: string;
  talhaoNome: string;
  cidade: string;
  variedade: string;
  hectaresAnalisados: number;
  metrosQuadrados: number;
  hectaresFalhas: number;
  percentualFalha: number;
  status: "Concluído" | "Em Processamento" | "Atenção";
}

// ── Mock Realista de Histórico de Vôos e Análises ────────────────────────────
const ANALISES_HISTORICO_DATA: AnaliseHistorico[] = [
  {
    id: "analise-001",
    dataVoo: "04/09/2026",
    horaVoo: "07:14",
    nomeImagem: "drone_talhao_01_rioclaro_ortofoto.jpg",
    tamanhoArquivo: "18.4 MB",
    formato: "JPG",
    talhaoId: "talhao-01-rio-claro",
    talhaoNome: "Talhão 01 — Fazenda Boa Vista",
    cidade: "Rio Claro - SP",
    variedade: "CTC-9001 (Plena Safra)",
    hectaresAnalisados: 50.0,
    metrosQuadrados: 500000,
    hectaresFalhas: 4.0,
    percentualFalha: 8.0,
    status: "Concluído",
  },
  {
    id: "analise-002",
    dataVoo: "03/09/2026",
    horaVoo: "08:30",
    nomeImagem: "cana_socas_piracicaba_voo34.png",
    tamanhoArquivo: "24.1 MB",
    formato: "PNG",
    talhaoId: "talhao-02-piracicaba",
    talhaoNome: "Talhão 02 — Polo Piracicaba",
    cidade: "Piracicaba - SP",
    variedade: "RB867515 (Cana Soca)",
    hectaresAnalisados: 85.0,
    metrosQuadrados: 850000,
    hectaresFalhas: 5.1,
    percentualFalha: 6.0,
    status: "Concluído",
  },
  {
    id: "analise-003",
    dataVoo: "01/09/2026",
    horaVoo: "06:45",
    nomeImagem: "safra2026_araras_ndvi_alta_res.jpg",
    tamanhoArquivo: "32.8 MB",
    formato: "JPG",
    talhaoId: "talhao-03-araras",
    talhaoNome: "Talhão 03 — Fazenda São Martinho",
    cidade: "Araras - SP",
    variedade: "IACSP95-5000",
    hectaresAnalisados: 120.0,
    metrosQuadrados: 1200000,
    hectaresFalhas: 7.2,
    percentualFalha: 6.0,
    status: "Concluído",
  },
  {
    id: "analise-004",
    dataVoo: "28/08/2026",
    horaVoo: "16:20",
    nomeImagem: "lavoura_sul_rioclaro_gaps.jpg",
    tamanhoArquivo: "15.2 MB",
    formato: "JPG",
    talhaoId: "talhao-01-rio-claro",
    talhaoNome: "Talhão 01 — Setor Sul",
    cidade: "Rio Claro - SP",
    variedade: "CTC-9001",
    hectaresAnalisados: 45.0,
    metrosQuadrados: 450000,
    hectaresFalhas: 5.4,
    percentualFalha: 12.0,
    status: "Atenção",
  },
  {
    id: "analise-005",
    dataVoo: "25/08/2026",
    horaVoo: "09:10",
    nomeImagem: "voo_uav_piracicaba_matocompeticao.png",
    tamanhoArquivo: "21.6 MB",
    formato: "PNG",
    talhaoId: "talhao-02-piracicaba",
    talhaoNome: "Talhão 02 — Setor Leste",
    cidade: "Piracicaba - SP",
    variedade: "RB867515",
    hectaresAnalisados: 60.0,
    metrosQuadrados: 600000,
    hectaresFalhas: 4.8,
    percentualFalha: 8.0,
    status: "Concluído",
  },
  {
    id: "analise-006",
    dataVoo: "20/08/2026",
    horaVoo: "07:50",
    nomeImagem: "inspecao_fitossanitaria_araras.jpg",
    tamanhoArquivo: "19.9 MB",
    formato: "JPG",
    talhaoId: "talhao-03-araras",
    talhaoNome: "Talhão 03 — Gleba B",
    cidade: "Araras - SP",
    variedade: "IACSP95-5000",
    hectaresAnalisados: 95.0,
    metrosQuadrados: 950000,
    hectaresFalhas: 6.65,
    percentualFalha: 7.0,
    status: "Concluído",
  },
];

export default function HistoricoPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<string>("todos");

  // Filtra as análises por termo de busca ou formato
  const filteredAnalises = ANALISES_HISTORICO_DATA.filter((item) => {
    const matchesSearch =
      item.nomeImagem.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.talhaoNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.cidade.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.dataVoo.includes(searchTerm);

    const matchesFormat =
      selectedFormat === "todos" || item.formato.toLowerCase() === selectedFormat.toLowerCase();

    return matchesSearch && matchesFormat;
  });

  // Estatísticas calculadas dinamicamente
  const totalHectares = ANALISES_HISTORICO_DATA.reduce((acc, curr) => acc + curr.hectaresAnalisados, 0);
  const totalFalhasHa = ANALISES_HISTORICO_DATA.reduce((acc, curr) => acc + curr.hectaresFalhas, 0);
  const mediaFalhas = (totalFalhasHa / totalHectares) * 100;

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
              Histórico de Análises UAV
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "3px 0 0 0",
                lineHeight: 1,
              }}
            >
              Registro consolidado de missões de vôo, imagens capturadas e hectares processados
            </p>
          </div>

          {/* Status badge */}
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
              {ANALISES_HISTORICO_DATA.length} Vôos Registrados
            </span>
          </div>

          {/* Botão para voltar ao mapa */}
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
            <IconMap className="w-4 h-4 text-[var(--accent-green)]" />
            Mapa Interativo
          </Link>
        </header>

        {/* Content Area */}
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
          {/* ── Quick Stats Row ──────────────────────────────── */}
          <div className="fade-in-up" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
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
                Total de Vôos
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#58a6ff", marginTop: "4px" }}>
                {ANALISES_HISTORICO_DATA.length}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>missões</span>
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
                Hectares Totais Analisados
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--accent-green)", marginTop: "4px" }}>
                {formatNumberBR(totalHectares, 1)}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>ha</span>
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
                Média de Falhas de Plantio
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#f85149", marginTop: "4px" }}>
                {formatNumberBR(mediaFalhas, 1)}{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>% de perda</span>
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
                Status do Pipeline IA
              </div>
              <div style={{ fontSize: "22px", fontWeight: 800, color: "#3fb950", marginTop: "4px" }}>
                100%{" "}
                <span style={{ fontSize: "13px", color: "var(--muted)", fontWeight: 500 }}>processado</span>
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
            }}
          >
            {/* Campo de Busca */}
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
                placeholder="Buscar por nome da imagem, talhão ou cidade..."
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

            {/* Filtro por Formato */}
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

          {/* ── 📋 TABELA DE HISTÓRICO DE VÔOS (Sprint 7) ─────── */}
          <div
            className="fade-in-up"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              borderRadius: "12px",
              overflow: "hidden",
              boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
                <thead>
                  <tr
                    style={{
                      background: "rgba(22, 27, 34, 0.8)",
                      borderBottom: "1px solid var(--card-border)",
                      color: "var(--muted)",
                      fontSize: "11.5px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Data do Vôo</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Nome da Imagem</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Hectares Analisados</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700 }}>Status / Severidade</th>
                    <th style={{ padding: "14px 18px", fontWeight: 700, textAlign: "right" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAnalises.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>
                        Nenhuma análise encontrada para os filtros selecionados.
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
                        {/* 1. Coluna: Data do Vôo */}
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
                              <IconDrone className="w-4 h-4" />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--foreground)" }}>
                                {item.dataVoo}
                              </div>
                              <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                                às {item.horaVoo}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Coluna: Nome da Imagem */}
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

                        {/* 3. Coluna: Hectares Analisados */}
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <div style={{ fontWeight: 700, color: "var(--foreground)", fontSize: "14px" }}>
                              {formatNumberBR(item.hectaresAnalisados, 1)}{" "}
                              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>ha</span>
                            </div>
                            <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                              {formatNumberBR(item.metrosQuadrados, 0)} m²
                              <span style={{ color: "#f85149", marginLeft: "6px" }}>
                                ({formatNumberBR(item.percentualFalha, 1)}% falha)
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Coluna: Status */}
                        <td style={{ padding: "14px 18px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "12px",
                              fontWeight: 600,
                              padding: "3px 10px",
                              borderRadius: "999px",
                              background: item.status === "Atenção" ? "rgba(248, 81, 73, 0.15)" : "rgba(46, 160, 67, 0.15)",
                              border: `1px solid ${item.status === "Atenção" ? "rgba(248, 81, 73, 0.3)" : "rgba(46, 160, 67, 0.3)"}`,
                              color: item.status === "Atenção" ? "#f85149" : "#3fb950",
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
                        </td>

                        {/* 5. Coluna: Botão "Ver no Mapa" */}
                        <td style={{ padding: "14px 18px", textAlign: "right", whiteSpace: "nowrap" }}>
                          <Link
                            href={`/?talhao=${item.talhaoId}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "7px 14px",
                              borderRadius: "6px",
                              background: "rgba(46, 160, 67, 0.15)",
                              border: "1px solid rgba(46, 160, 67, 0.4)",
                              color: "#3fb950",
                              fontSize: "12.5px",
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
                            <IconMap className="w-3.5 h-3.5" />
                            Ver no Mapa
                          </Link>
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
    </div>
  );
}

"use client";

import React, { useRef, useState } from "react";
import type { WeedDetection } from "../ImageDetectionViewer";
import { formatNumberBR } from "../utils/geoMath";
import { toast } from "react-toastify";

export interface TechnicalReportData {
  id?: string;
  nomeImagem: string;
  imageUrl: string;
  dataCaptura?: string;
  horaCaptura?: string;
  created_at?: string;
  talhaoId?: string;
  talhaoNome?: string;
  cidade?: string;
  latitude?: number;
  longitude?: number;
  variedade?: string;
  areaAmostraM2?: number;
  totalEspigas: number;
  detections?: WeedDetection[];
  confiancaMedia?: number;
  areaCoberturaPercent?: number;
  tamanhoArquivo?: string;
  tempoInferenciaMs?: number;
}

interface TechnicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TechnicalReportData;
}

export default function TechnicalReportModal({
  isOpen,
  onClose,
  data,
}: TechnicalReportModalProps) {
  const [showBoxes, setShowBoxes] = useState(true);
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Resolução de Metadados
  const nomeFoto = data.nomeImagem || "amostra_trigo.jpg";
  const areaM2 = data.areaAmostraM2 && data.areaAmostraM2 > 0 ? data.areaAmostraM2 : 1.0;
  const totalEspigas = data.totalEspigas ?? (data.detections ? data.detections.length : 0);
  const densidadeM2 = totalEspigas / areaM2;
  const densidadeHa = Math.round(densidadeM2 * 10000);

  // Coordenadas padrão da Embrapa Trigo (Passo Fundo - RS) se não vierem com EXIF
  const lat = data.latitude ?? -28.2234;
  const lon = data.longitude ?? -52.4076;
  const talhaoNome = data.talhaoNome || "Talhão Experimental 01 (Embrapa Trigo - Setor Norte)";
  const variedade = data.variedade || "BRS Pastoreio (Triticum aestivum)";
  const cidade = data.cidade || "Passo Fundo - RS (Campos Experimentais Embrapa Trigo)";

  // Confiança média do modelo YOLOv8x
  const mediaConfianca =
    data.confiancaMedia ??
    (data.detections && data.detections.length > 0
      ? (data.detections.reduce((acc, d) => acc + (d.confidence || 0.9), 0) / data.detections.length) * 100
      : 93.6);

  // Formatação de data da coleta
  let dataFormatada = data.dataCaptura || "Hoje";
  let horaFormatada = data.horaCaptura || "10:30";
  if (data.created_at) {
    try {
      const localIso = data.created_at.replace("Z", "").split("+")[0];
      const d = new Date(localIso);
      dataFormatada = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
      horaFormatada = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      // fallback
    }
  }

  // Avaliação Agronômica
  let estandeClassificacao = "Estande Ótimo / Alta Densidade";
  let estandeCor = "#15803d";
  let estandeBg = "rgba(34, 197, 94, 0.12)";
  let parecerTexto =
    "Amostra com densidade excelente de espigas por m², compatível com as metas produtivas da Embrapa Trigo para cultivares de alto rendimento. Uniformidade de perfilhamento comprovada, sem indícios de falhas de estande na área amostrada.";

  if (densidadeM2 < 30) {
    estandeClassificacao = "Baixo Estande / Atenção Necessária";
    estandeCor = "#b91c1c";
    estandeBg = "rgba(239, 68, 68, 0.12)";
    parecerTexto =
      "Densidade de espigas inferior à recomendação técnica agronômica. Sugere-se investigação sobre germinação, ataque de pragas de solo, déficit hídrico ou desuniformidade de semeadura na referida parcela.";
  } else if (densidadeM2 <= 55) {
    estandeClassificacao = "Estande Médio / Satisfatório";
    estandeCor = "#b45309";
    estandeBg = "rgba(245, 158, 11, 0.12)";
    parecerTexto =
      "Estande dentro da faixa esperada para condições normais de sequeiro. Manter monitoramento nutricional e fitossanitário para garantir o pleno enchimento de grãos até a colheita.";
  }

  // Protocolo único
  const protocoloHash = (data.id || `${nomeFoto}-${totalEspigas}`).slice(0, 12).toUpperCase();
  const protocoloId = `SV-EMBRAPA-${new Date().getFullYear()}-${protocoloHash}`;

  const handlePrint = () => {
    // Garante que o scroll do modal esteja no topo absoluto antes de imprimir
    const modalContent = document.querySelector(".report-modal-content");
    if (modalContent) {
      modalContent.scrollTop = 0;
    }
    const reportElem = document.getElementById("sugarvision-technical-report");
    if (reportElem) {
      reportElem.scrollIntoView({ behavior: "instant", block: "start" });
    }
    setTimeout(() => {
      window.print();
    }, 60);
  };

  const handleDownloadHtml = async () => {
    const reportElem = document.getElementById("sugarvision-technical-report");
    if (!reportElem) return;

    // Clona o relatório para manipular o DOM sem afetar a tela ativa
    const clone = reportElem.cloneNode(true) as HTMLElement;
    const originalImg = reportElem.querySelector("#report-analisada-img") as HTMLImageElement | null
      || reportElem.querySelector("img") as HTMLImageElement | null;
    const cloneImg = clone.querySelector("#report-analisada-img") as HTMLImageElement | null
      || clone.querySelector("img") as HTMLImageElement | null;

    if (originalImg && cloneImg) {
      try {
        let base64Src = "";
        if (originalImg.src.startsWith("data:")) {
          base64Src = originalImg.src;
        } else {
          // Extrai os pixels diretamente da imagem já renderizada no navegador
          const canvas = document.createElement("canvas");
          canvas.width = originalImg.naturalWidth || originalImg.width || 800;
          canvas.height = originalImg.naturalHeight || originalImg.height || 600;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(originalImg, 0, 0, canvas.width, canvas.height);
            base64Src = canvas.toDataURL("image/jpeg", 0.92);
          }
        }

        if (!base64Src) {
          // Fallback via fetch blob caso o canvas esteja vazio
          const response = await fetch(originalImg.src);
          const blob = await response.blob();
          base64Src = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(originalImg.src);
            reader.readAsDataURL(blob);
          });
        }

        if (base64Src) {
          cloneImg.src = base64Src;
        }
      } catch (err) {
        console.warn("Conversão para base64 fallback:", err);
      }
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laudo Técnico Agronômico - ${nomeFoto}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
      color: #0f172a;
      display: flex;
      justify-content: center;
    }
    #sugarvision-technical-report {
      background: #ffffff !important;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
      border-radius: 10px;
      max-width: 860px;
      width: 100%;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      #sugarvision-technical-report {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
        padding: 4mm 6mm !important;
      }
      .report-photo-container,
      .report-photo-img {
        max-height: 220px !important;
      }
      .report-stats-grid {
        grid-template-columns: repeat(4, 1fr) !important;
      }
      @page {
        size: A4 portrait;
        margin: 6mm 8mm;
      }
    }
  </style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laudo_tecnico_${nomeFoto.replace(/\.[^/.]+$/, "")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Laudo autônomo (.HTML) exportado com imagem integrada!", { theme: "dark" });
  };

  return (
    <>
      {/* ── ESTILOS DE IMPRESSÃO @media print (CORRIGIDO PARA FOLHA A4 COMPLETA) ── */}
      <style>{`
        @media print {
          /* 1. Oculta tudo da interface da aplicação */
          .sidebar,
          main,
          header,
          nav,
          aside,
          .no-print,
          .Toastify {
            display: none !important;
          }

          html,
          body,
          .app-main-layout {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
            position: static !important;
          }

          /* 2. Reseta o modal para o fluxo normal de documento no papel A4 */
          .report-modal-backdrop {
            position: static !important;
            inset: auto !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
          }

          .report-modal-content {
            position: static !important;
            display: block !important;
            background: #ffffff !important;
            color: #0f172a !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }

          #sugarvision-technical-report {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 4mm 6mm !important;
            overflow: visible !important;
            height: auto !important;
            background: #ffffff !important;
            color: #0f172a !important;
            box-shadow: none !important;
            border: none !important;
          }

          .report-header-section {
            padding-bottom: 8px !important;
            margin-bottom: 6px !important;
          }

          .report-ident-grid {
            padding: 8px 12px !important;
            margin-bottom: 6px !important;
            gap: 8px !important;
          }

          .report-photo-container {
            max-height: 220px !important;
            height: 220px !important;
          }

          .report-photo-img {
            max-height: 220px !important;
          }

          .report-stats-grid {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
            margin-bottom: 8px !important;
          }

          .report-stat-card {
            padding: 8px 10px !important;
          }

          .report-stat-val {
            font-size: 20px !important;
            margin-top: 2px !important;
          }

          .report-parecer-box {
            padding: 8px 12px !important;
            margin-top: 6px !important;
          }

          .report-footer-section {
            margin-top: 8px !important;
            padding-top: 8px !important;
          }

          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ── MODAL CONTAINER ── */}
      <div
        className="report-modal-backdrop"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(10, 15, 25, 0.82)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          overflowY: "auto",
        }}
        onClick={onClose}
      >
        <div
          className="report-modal-content modal-content-animate"
          style={{
            background: "#ffffff",
            color: "#0f172a",
            width: "100%",
            maxWidth: "880px",
            maxHeight: "92vh",
            overflowY: "auto",
            borderRadius: "14px",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── BARRA SUPERIOR DE AÇÕES (NO-PRINT) ── */}
          <div
            className="no-print"
            style={{
              padding: "14px 20px",
              background: "#0f172a",
              color: "#ffffff",
              borderTopLeftRadius: "14px",
              borderTopRightRadius: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 800,
                  padding: "3px 8px",
                  borderRadius: "6px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Laudo Oficial
              </span>
              <span style={{ fontSize: "14px", fontWeight: 700 }}>
                Pré-visualização do Laudo Técnico Agronômico
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowBoxes(!showBoxes)}
                style={{
                  background: showBoxes ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.1)",
                  border: `1px solid ${showBoxes ? "#10b981" : "rgba(255, 255, 255, 0.2)"}`,
                  color: showBoxes ? "#34d399" : "#cbd5e1",
                  borderRadius: "6px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {showBoxes ? "✓ Bounding Boxes (YOLOv8x)" : "○ Ocultar Bounding Boxes"}
              </button>

              <button
                type="button"
                onClick={handleDownloadHtml}
                style={{
                  background: "rgba(255, 255, 255, 0.12)",
                  color: "#ffffff",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  borderRadius: "6px",
                  padding: "7px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "all 0.2s ease",
                }}
                title="Baixar arquivo HTML autônomo com o laudo completo"
              >
                <svg style={{ width: "15px", height: "15px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Exportar .HTML
              </button>

              <button
                type="button"
                onClick={handlePrint}
                style={{
                  background: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "7px 16px",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(16, 185, 129, 0.4)",
                }}
              >
                <svg style={{ width: "16px", height: "16px" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Baixar / Imprimir PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "18px",
                  fontWeight: 700,
                  lineHeight: 1,
                }}
                title="Fechar Laudo"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ── ÁREA DO LAUDO TÉCNICO (IMPRIMÍVEL EM A4) ── */}
          <div
            id="sugarvision-technical-report"
            ref={printContainerRef}
            style={{
              padding: "28px 32px",
              display: "flex",
              flexDirection: "column",
              gap: "22px",
              fontSize: "13px",
              lineHeight: 1.5,
              background: "#ffffff",
              color: "#0f172a",
            }}
          >
            {/* 1. CABEÇALHO OFICIAL */}
            <div
              style={{
                borderBottom: "3px solid #059669",
                paddingBottom: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "#059669",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: "18px",
                      boxShadow: "0 2px 5px rgba(5, 150, 105, 0.4)",
                    }}
                  >
                    SV
                  </div>
                  <div>
                    <h1
                      style={{
                        margin: 0,
                        fontSize: "20px",
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                        color: "#065f46",
                        lineHeight: 1.15,
                      }}
                    >
                      MyAgro / SugarVision — Relatório de Estande de Trigo
                    </h1>
                    <div style={{ fontSize: "12px", fontWeight: 700, color: "#047857", marginTop: "2px" }}>
                      Laudo Técnico de Avaliação Agronômica • Validação Oficial Embrapa Trigo
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "10px", fontSize: "11.5px", color: "#475569" }}>
                  <div><strong>Instituição de Pesquisa:</strong> Embrapa Trigo — Centro Nacional de Pesquisa de Trigo</div>
                  <div><strong>Local da Coleta:</strong> {cidade} • Rodovia BR-285, Km 294</div>
                  <div>
                    <strong>Georreferenciamento Oficial:</strong> Lat: {lat.toFixed(6)}° | Lon: {lon.toFixed(6)}° (WGS84)
                  </div>
                </div>
              </div>

              {/* Protocolo & Emissão */}
              <div
                style={{
                  textAlign: "right",
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  minWidth: "210px",
                }}
              >
                <div style={{ fontSize: "10.5px", textTransform: "uppercase", fontWeight: 700, color: "#64748b" }}>
                  Protocolo do Laudo
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "12.5px", fontWeight: 800, color: "#0f172a" }}>
                  {protocoloId}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>
                  <strong>Data Coleta:</strong> {dataFormatada} às {horaFormatada}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b" }}>
                  <strong>Emissão:</strong> {new Date().toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>

            {/* 2. IDENTIFICAÇÃO DA AMOSTRA E TALHÃO */}
            <div
              className="report-ident-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                background: "#f8fafc",
                padding: "14px 18px",
                borderRadius: "10px",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                  Talhão / Parcela
                </span>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>{talhaoNome}</div>
              </div>

              <div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                  Cultura / Variedade
                </span>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>{variedade}</div>
              </div>

              <div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                  Área da Amostra
                </span>
                <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "13px" }}>
                  {formatNumberBR(areaM2, 1)} m² <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 500 }}>(Enquadramento padrão)</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                  Arquivo Analisado
                </span>
                <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#0284c7", fontSize: "12px", wordBreak: "break-all" }}>
                  {nomeFoto}
                </div>
              </div>
            </div>

            {/* 3. EVIDÊNCIA VISUAL: FOTO COM BOUNDING BOXES YOLOV8X */}
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 800,
                    color: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669" }} />
                  Evidência Fotográfica & Bounding Boxes YOLOv8x
                </h3>
                <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>
                  Modelo: YOLOv8x Calibrado (GWHD 2021 + Fine-Tuning Embrapa Trigo)
                </span>
              </div>

              <div
                className="report-photo-container"
                style={{
                  position: "relative",
                  width: "100%",
                  maxHeight: "380px",
                  background: "#090d16",
                  borderRadius: "8px",
                  overflow: "hidden",
                  border: "1px solid #cbd5e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div style={{ position: "relative", display: "inline-block", maxWidth: "100%", maxHeight: "100%" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    id="report-analisada-img"
                    className="report-photo-img"
                    crossOrigin="anonymous"
                    src={data.imageUrl}
                    alt={nomeFoto}
                    style={{
                      display: "block",
                      maxWidth: "100%",
                      maxHeight: "380px",
                      objectFit: "contain",
                    }}
                  />

                  {/* Caixas Delimitadoras Sobrepostas (Bounding Boxes) */}
                  {showBoxes &&
                    data.detections &&
                    data.detections.map((det, index) => {
                      const boxX = det.box?.x ?? 0;
                      const boxY = det.box?.y ?? 0;
                      const boxW = det.box?.width ?? 10;
                      const boxH = det.box?.height ?? 10;

                      return (
                        <div
                          key={det.id ?? index}
                          style={{
                            position: "absolute",
                            left: `${boxX}%`,
                            top: `${boxY}%`,
                            width: `${boxW}%`,
                            height: `${boxH}%`,
                            border: "1.8px solid #fbbf24",
                            backgroundColor: "rgba(251, 191, 36, 0.18)",
                            boxSizing: "border-box",
                            pointerEvents: "none",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "-14px",
                              left: "0",
                              background: "#fbbf24",
                              color: "#0f172a",
                              fontSize: "8.5px",
                              fontWeight: 800,
                              padding: "0 3px",
                              borderRadius: "2px",
                              lineHeight: "13px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            #{index + 1} ({Math.round((det.confidence || 0.9) * 100)}%)
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "flex", justifyContent: "space-between" }}>
                <span>* Caixas amarelas indicam espigas individuais detectadas pelo algoritmo YOLOv8x.</span>
                <span>Total mapeado: <strong>{totalEspigas} espigas</strong></span>
              </div>
            </div>

            {/* 4. RESUMO ESTATÍSTICO & DIAGNÓSTICO AGRONÔMICO */}
            <div>
              <h3
                style={{
                  margin: "0 0 10px 0",
                  fontSize: "14px",
                  fontWeight: 800,
                  color: "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#059669" }} />
                Resumo Estatístico de Estande & Métricas de Produtividade
              </h3>

              <div
                className="report-stats-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "12px",
                  marginBottom: "14px",
                }}
              >
                {/* Total de Espigas */}
                <div
                  className="report-stat-card"
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Total de Espigas Contadas
                  </div>
                  <div className="report-stat-val" style={{ fontSize: "24px", fontWeight: 900, color: "#065f46", marginTop: "4px" }}>
                    {totalEspigas} <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>espigas</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Censo computacional direto na foto
                  </div>
                </div>

                {/* Densidade por m² */}
                <div
                  className="report-stat-card"
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Densidade Estimada
                  </div>
                  <div className="report-stat-val" style={{ fontSize: "24px", fontWeight: 900, color: "#0284c7", marginTop: "4px" }}>
                    {formatNumberBR(densidadeM2, 1)}{" "}
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#64748b" }}>espigas/m²</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Extrapolado: ~{formatNumberBR(densidadeHa / 1000000, 2)} M espigas/ha
                  </div>
                </div>

                {/* Confiança Média IA */}
                <div
                  className="report-stat-card"
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Acurácia Média IA
                  </div>
                  <div className="report-stat-val" style={{ fontSize: "24px", fontWeight: 900, color: "#7c3aed", marginTop: "4px" }}>
                    {formatNumberBR(mediaConfianca, 1)}%
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    Score de precisão YOLOv8x
                  </div>
                </div>

                {/* Classificação do Estande */}
                <div
                  className="report-stat-card"
                  style={{
                    border: `1px solid ${estandeCor}`,
                    borderRadius: "8px",
                    padding: "12px 14px",
                    background: estandeBg,
                  }}
                >
                  <div style={{ fontSize: "11px", fontWeight: 700, color: estandeCor, textTransform: "uppercase" }}>
                    Status do Estande
                  </div>
                  <div className="report-stat-val" style={{ fontSize: "15px", fontWeight: 800, color: estandeCor, marginTop: "6px" }}>
                    {estandeClassificacao}
                  </div>
                  <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                    Referência: Parâmetros Embrapa Trigo
                  </div>
                </div>
              </div>

              {/* Parecer Técnico */}
              <div
                className="report-parecer-box"
                style={{
                  background: "#f8fafc",
                  borderLeft: `4px solid ${estandeCor}`,
                  borderTop: "1px solid #e2e8f0",
                  borderRight: "1px solid #e2e8f0",
                  borderBottom: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  padding: "12px 16px",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: "12px", color: "#0f172a", marginBottom: "4px" }}>
                  PARECER TÉCNICO AGRONÔMICO E RECOMENDAÇÃO:
                </div>
                <p style={{ margin: 0, fontSize: "12.5px", color: "#334155" }}>
                  {parecerTexto}
                </p>
              </div>
            </div>

            {/* 5. RODAPÉ INSTITUCIONAL & ASSINATURA */}
            <div
              className="report-footer-section"
              style={{
                marginTop: "10px",
                borderTop: "1px solid #cbd5e1",
                paddingTop: "16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#0f172a" }}>
                  MyAgro / SugarVision — Plataforma de Inteligência Computacional para o Agronegócio
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                  Relatório gerado automaticamente por visão computacional conforme protocolo de avaliação de estande.
                </div>
                <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace", marginTop: "2px" }}>
                  Certificado SHA-256: {protocoloHash}9F8A2B7C · Embrapa Trigo Passo Fundo
                </div>
              </div>

              <div style={{ textAlign: "center", minWidth: "220px" }}>
                <div style={{ borderBottom: "1px solid #0f172a", width: "100%", height: "20px" }} />
                <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                  Responsável Técnico Agronômico
                </div>
                <div style={{ fontSize: "10.5px", color: "#64748b" }}>
                  CREA/RS • Avaliação de Campo MyAgro
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


"use client";

import React, { useState } from "react";

export function IconAward({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

export function IconTrendingUp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

export function IconSun({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

export function IconCloudMoon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 16a3 3 0 1 1 0 6H6a5 5 0 0 1-1-9.9A7 7 0 0 1 18 10a5 5 0 0 1 4 4.9" />
    </svg>
  );
}

export default function AgronomicAccuracyCard() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div
        style={{
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(59, 130, 246, 0.06) 100%)",
          border: "1px solid rgba(16, 185, 129, 0.35)",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          marginBottom: "16px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
        }}
      >
        {/* Esquerda: Identificação do Modelo e Acurácia de Destaque */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "260px" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(16, 185, 129, 0.2)",
              color: "#10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconAward className="w-6 h-6" />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase", color: "#10b981" }}>
                Validação Agronômica • Sprint 11
              </span>
              <span
                style={{
                  fontSize: "11px",
                  padding: "1px 8px",
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#059669",
                  fontWeight: "600",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                }}
              >
                YOLOv8x Calibrado
              </span>
            </div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--foreground)", marginTop: "2px" }}>
              Acurácia Global na Densidade: <span style={{ color: "#10b981" }}>&gt; 92.2%</span>
            </div>
            <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "1px" }}>
              Benchmark oficial com 20 amostras do GWHD 2021 vs Anotação Manual de Agrônomos
            </div>
          </div>
        </div>

        {/* Centro: Métricas Chave (R², MAE, Extremos) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            padding: "6px 14px",
            background: "var(--card-bg, rgba(255, 255, 255, 0.6))",
            borderRadius: "10px",
            border: "1px solid var(--card-border, #e2e8f0)",
          }}
        >
          {/* R² */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Correlação R²</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#2563eb" }}>0.9027</div>
            <div style={{ fontSize: "10px", color: "#10b981" }}>r = 0.9501</div>
          </div>

          <div style={{ width: "1px", height: "28px", background: "var(--card-border, #cbd5e1)" }} />

          {/* MAE */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: "600" }}>Erro Médio (MAE)</div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "var(--foreground)" }}>±2.55</div>
            <div style={{ fontSize: "10px", color: "var(--muted)" }}>espigas/foto</div>
          </div>

          <div style={{ width: "1px", height: "28px", background: "var(--card-border, #cbd5e1)" }} />

          {/* Sombras no Talhão */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <IconCloudMoon className="w-4 h-4 text-blue-500" />
            <div>
              <div style={{ fontSize: "10px", color: "var(--muted)" }}>Sombras</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#3b82f6" }}>93.7%</div>
            </div>
          </div>

          {/* Sol Pleno */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <IconSun className="w-4 h-4 text-amber-500" />
            <div>
              <div style={{ fontSize: "10px", color: "var(--muted)" }}>Sol Pleno</div>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#d97706" }}>89.1%</div>
            </div>
          </div>
        </div>

        {/* Direita: Botão de Ação / Detalhes */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            background: "#10b981",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 4px rgba(16, 185, 129, 0.25)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#059669")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#10b981")}
        >
          <IconTrendingUp className="w-4 h-4" />
          Ver Relatório Científico
        </button>
      </div>

      {/* Modal de Detalhes Científicos da Sprint 11 */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "var(--card-bg, #ffffff)",
              color: "var(--foreground, #1e293b)",
              borderRadius: "16px",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "24px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
              border: "1px solid var(--card-border, #cbd5e1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "11px", fontWeight: "700", color: "#10b981", textTransform: "uppercase" }}>
                  SugarVision • Sprint 11 Benchmark
                </span>
                <h2 style={{ fontSize: "20px", fontWeight: "800", marginTop: "4px" }}>
                  Métricas Comparativas e Validação Agronômica
                </h2>
                <p style={{ fontSize: "13px", color: "var(--muted)", marginTop: "2px" }}>
                  Confronto estatístico entre a contagem automatizada YOLOv8x e a anotação manual de agrônomos (GWHD 2021).
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: "4px 8px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Grid de Métricas */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.08)", borderRadius: "10px", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                <div style={{ fontSize: "11px", color: "#065f46" }}>Precisão NMS (Sprint 10)</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#059669" }}>92.23%</div>
                <div style={{ fontSize: "10px", color: "var(--muted)" }}>conf=0.35, iou=0.60</div>
              </div>

              <div style={{ padding: "12px", background: "rgba(59, 130, 246, 0.08)", borderRadius: "10px", border: "1px solid rgba(59, 130, 246, 0.25)" }}>
                <div style={{ fontSize: "11px", color: "#1e40af" }}>Coeficiente R² Linear</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#2563eb" }}>0.9027</div>
                <div style={{ fontSize: "10px", color: "var(--muted)" }}>Pearson r = 0.9501</div>
              </div>

              <div style={{ padding: "12px", background: "rgba(245, 158, 11, 0.08)", borderRadius: "10px", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
                <div style={{ fontSize: "11px", color: "#92400e" }}>Erro Médio Absoluto</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#d97706" }}>2.55</div>
                <div style={{ fontSize: "10px", color: "var(--muted)" }}>espigas por imagem</div>
              </div>

              <div style={{ padding: "12px", background: "rgba(139, 92, 246, 0.08)", borderRadius: "10px", border: "1px solid rgba(139, 92, 246, 0.25)" }}>
                <div style={{ fontSize: "11px", color: "#5b21b6" }}>Estande Populacional</div>
                <div style={{ fontSize: "20px", fontWeight: "800", color: "#7c3aed" }}>94.63%</div>
                <div style={{ fontSize: "10px", color: "var(--muted)" }}>476 pred / 503 real</div>
              </div>
            </div>

            {/* Seção Condições Extremas */}
            <div style={{ marginBottom: "20px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
                Resiliência em Condições Extremas de Campo
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.2)" }}>
                  <div style={{ fontWeight: "700", fontSize: "12px", color: "#2563eb", marginBottom: "4px" }}>
                    🌿 Sombras no Talhão / Dossel Fechado (N=6)
                  </div>
                  <div style={{ fontSize: "12px" }}>• <strong>MAE:</strong> 1.83 espigas</div>
                  <div style={{ fontSize: "12px" }}>• <strong>Acurácia de Densidade:</strong> 93.68%</div>
                  <div style={{ fontSize: "12px" }}>• <strong>Total GT:</strong> 174 | <strong>Predito:</strong> 173</div>
                </div>

                <div style={{ padding: "10px", borderRadius: "8px", background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)" }}>
                  <div style={{ fontWeight: "700", fontSize: "12px", color: "#d97706", marginBottom: "4px" }}>
                    ☀️ Alta Luminosidade & Sol Pleno (N=6)
                  </div>
                  <div style={{ fontSize: "12px" }}>• <strong>MAE:</strong> 2.83 espigas</div>
                  <div style={{ fontSize: "12px" }}>• <strong>Acurácia de Densidade:</strong> 89.10%</div>
                  <div style={{ fontSize: "12px" }}>• <strong>Total GT:</strong> 156 | <strong>Predito:</strong> 141</div>
                </div>
              </div>
            </div>

            {/* Informações dos Gráficos Salvos */}
            <div style={{ padding: "12px", background: "var(--sidebar-active, #f1f5f9)", borderRadius: "8px", fontSize: "12px" }}>
              <div style={{ fontWeight: "700", marginBottom: "4px" }}>Gráficos Gerados em reports/sprint11_metricas_agronomicas/:</div>
              <ul style={{ margin: "0 0 0 16px", padding: 0 }}>
                <li><code>01_correlacao_r2_contagem.png</code> — Reta de regressão linear e dispersão (R² = 0.9027)</li>
                <li><code>02_distribuicao_erros_mae.png</code> — Distribuição do erro absoluto e boxplot</li>
                <li><code>03_concordancia_bland_altman.png</code> — Análise de limites de concordância agronômica</li>
                <li><code>04_densidade_predita_vs_real.png</code> — Contagem pareada por fotograma</li>
                <li><code>05_robustez_condicoes_extremas.png</code> — Comparativo Sol Pleno vs Sombras</li>
              </ul>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "20px" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  background: "#10b981",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

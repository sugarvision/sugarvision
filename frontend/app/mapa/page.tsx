"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Sidebar, IconLeaf, IconMap } from "../components/Sidebar";

// Carregamento dinâmico sem SSR para compatibilidade com o Leaflet
const FieldMap = dynamic(() => import("./FieldMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        background: "#0d1117",
        color: "var(--muted)",
        fontSize: "14px",
      }}
    >
      🛰️ Inicializando visualização geoespacial de satélite...
    </div>
  ),
});

export default function MapaPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* ── Conteúdo Central ── */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        {/* Cabeçalho */}
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
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <IconMap className="w-4 h-4 text-[var(--accent-green)]" />
              Mapa de Campo & Monitoramento Geoespacial
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "4px 0 0 0",
                lineHeight: 1,
              }}
            >
              Geolocalização de talhões, anomalias e fotos aéreas de cana-de-açúcar
            </p>
          </div>

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
            }}
          >
            <IconLeaf className="w-4 h-4 text-[var(--accent-green)]" />
            Painel Principal
          </Link>
        </header>

        {/* Área do Mapa em Tela Cheia */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <FieldMap />

          {/* Card Flutuante de Legenda */}
          <div
            style={{
              position: "absolute",
              bottom: "24px",
              left: "24px",
              zIndex: 1000,
              background: "rgba(22, 27, 34, 0.9)",
              backdropFilter: "blur(8px)",
              border: "1px solid var(--card-border)",
              borderRadius: "10px",
              padding: "12px 16px",
              color: "var(--foreground)",
              fontSize: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            }}
          >
            <span style={{ fontWeight: 700, fontSize: "11px", color: "var(--muted)", textTransform: "uppercase" }}>
              Legenda do Campo
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#f85149" }} />
              <span>Alta Infestação / Falha de Plantio</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#d29922" }} />
              <span>Infestação Moderada</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#2ea043" }} />
              <span>Ponto de Amostra UAV (Drone)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
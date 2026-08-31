"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => <p style={{ padding: "20px", color: "var(--muted)" }}>Carregando mapa...</p>,
});

// ── Icons (inline SVGs to avoid external dependency) ─────────────────────────
function IconDrone({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0" />
      <path d="M3 3l4 4M17 3l-4 4M3 21l4-4M17 21l-4-4" />
      <path d="M7 7a4 4 0 0 1 5.657 0M11.343 7A4 4 0 0 1 17 7" />
      <path d="M7 17a4 4 0 0 0 5.657 0M11.343 17A4 4 0 0 0 17 17" />
    </svg>
  );
}

function IconMap({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" />
      <line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  );
}

function IconChart({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconLeaf({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

function IconAlert({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function IconSettings({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconPlus({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function IconLayers({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

function IconMenu({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconX({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

// ── Nav items ─────────────────────────────────────────────────────────────────
const navItems = [
  { id: "mapa", label: "Mapa de Campos", icon: IconMap, active: true },
  { id: "analises", label: "Análises UAV", icon: IconDrone },
  { id: "relatorios", label: "Relatórios NDVI", icon: IconChart },
  { id: "culturas", label: "Culturas", icon: IconLeaf },
  { id: "alertas", label: "Alertas", icon: IconAlert, badge: 3 },
  { id: "camadas", label: "Camadas de Mapa", icon: IconLayers },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [activeId, setActiveId] = useState("mapa");

  return (
    <aside
      style={{
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--sidebar-border)",
        width: collapsed ? "64px" : "240px",
        transition: "width 0.25s ease",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
      }}
    >
      {/* Logo area */}
      <div
        style={{
          padding: collapsed ? "20px 0" : "20px 16px",
          borderBottom: "1px solid var(--sidebar-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: "64px",
        }}
      >
        {!collapsed && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background:
                  "linear-gradient(135deg, var(--accent-green), #1a7a2e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconDrone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "15px",
                  color: "var(--foreground)",
                  lineHeight: 1,
                }}
              >
                MyAgro
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  lineHeight: 1,
                  marginTop: "2px",
                }}
              >
                SugarVision UAV
              </div>
            </div>
          </div>
        )}

        {collapsed && (
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--accent-green), #1a7a2e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconDrone className="w-5 h-5 text-white" />
          </div>
        )}

        {!collapsed && (
          <button
            id="sidebar-toggle-btn"
            onClick={onToggle}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--muted)",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "var(--foreground)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "var(--muted)")
            }
            aria-label="Recolher menu lateral"
          >
            <IconX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          padding: "12px 0",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: collapsed ? "0" : "0 8px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {navItems.map((item) => {
            const isActive = activeId === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                className="nav-item"
                onClick={() => setActiveId(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: collapsed ? "10px 0" : "10px 12px",
                  borderRadius: collapsed ? "0" : "8px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive
                    ? "rgba(46, 160, 67, 0.12)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: isActive ? "var(--accent-green)" : "var(--muted)",
                  width: "100%",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background =
                      "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "var(--foreground)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--muted)";
                  }
                }}
                aria-label={item.label}
                title={collapsed ? item.label : undefined}
              >
                {/* Active left bar */}
                {isActive && (
                  <span
                    style={{
                      position: "absolute",
                      left: collapsed ? 0 : "-8px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: "3px",
                      height: "60%",
                      background: "var(--accent-green)",
                      borderRadius: "0 3px 3px 0",
                    }}
                  />
                )}

                <Icon
                  className={`flex-shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}
                />

                {!collapsed && (
                  <>
                    <span
                      style={{
                        fontSize: "13.5px",
                        fontWeight: isActive ? 600 : 400,
                        flex: 1,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        style={{
                          background: "#da3633",
                          color: "#fff",
                          fontSize: "11px",
                          fontWeight: 700,
                          borderRadius: "999px",
                          padding: "1px 6px",
                          lineHeight: "1.4",
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {collapsed && item.badge && (
                  <span
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "12px",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: "#da3633",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom section */}
      <div
        style={{
          borderTop: "1px solid var(--sidebar-border)",
          padding: collapsed ? "12px 0" : "12px 8px",
        }}
      >
        <button
          id="nav-configuracoes"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: collapsed ? "10px 0" : "10px 12px",
            borderRadius: collapsed ? "0" : "8px",
            justifyContent: collapsed ? "center" : "flex-start",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            width: "100%",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.color = "var(--foreground)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted)";
          }}
          aria-label="Configurações"
          title={collapsed ? "Configurações" : undefined}
        >
          <IconSettings
            className={`flex-shrink-0 ${collapsed ? "w-5 h-5" : "w-4 h-4"}`}
          />
          {!collapsed && (
            <span style={{ fontSize: "13.5px", whiteSpace: "nowrap" }}>
              Configurações
            </span>
          )}
        </button>

        {/* User avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: collapsed ? "10px 0" : "10px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
            marginTop: "4px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2ea043, #0d4f1c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            M4
          </div>
          {!collapsed && (
            <div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--foreground)",
                  lineHeight: 1,
                }}
              >
                Membro 4
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginTop: "2px",
                }}
              >
                Frontend Dev
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderRadius: "10px",
        padding: "14px 16px",
        flex: "1 1 140px",
        minWidth: "0",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          fontWeight: 600,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color,
          lineHeight: 1,
        }}
      >
        {value}
        <span
          style={{ fontSize: "13px", fontWeight: 400, color: "var(--muted)", marginLeft: "4px" }}
        >
          {unit}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const handleNewAnalysis = () => {
    setAnalysisLoading(true);
    setTimeout(() => setAnalysisLoading(false), 1800);
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* ── Sidebar ─────────────────────────────────────── */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(true)}
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
          {/* Expand sidebar button (shown when collapsed) */}
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
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--foreground)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--muted)")
              }
              aria-label="Expandir menu lateral"
            >
              <IconMenu className="w-5 h-5" />
            </button>
          )}

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
              Mapa de Campos
            </h1>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                margin: "3px 0 0 0",
                lineHeight: 1,
              }}
            >
              Visualização e monitoramento de áreas monitoradas via UAV
            </p>
          </div>

          {/* Status indicator */}
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

          {/* ✅ BOTÃO PRINCIPAL: Nova Análise UAV */}
          <button
            id="btn-nova-analise-uav"
            onClick={handleNewAnalysis}
            disabled={analysisLoading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "9px 18px",
              borderRadius: "8px",
              background: analysisLoading
                ? "rgba(46,160,67,0.5)"
                : "var(--accent-green)",
              border: "none",
              cursor: analysisLoading ? "not-allowed" : "pointer",
              color: "#fff",
              fontSize: "13.5px",
              fontWeight: 600,
              letterSpacing: "0.01em",
              boxShadow: analysisLoading
                ? "none"
                : "0 0 0 1px rgba(46,160,67,0.4), 0 4px 12px rgba(46,160,67,0.3)",
              transition: "all 0.2s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!analysisLoading) {
                e.currentTarget.style.background = "var(--accent-green-hover)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 1px rgba(46,160,67,0.6), 0 6px 20px rgba(46,160,67,0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!analysisLoading) {
                e.currentTarget.style.background = "var(--accent-green)";
                e.currentTarget.style.boxShadow =
                  "0 0 0 1px rgba(46,160,67,0.4), 0 4px 12px rgba(46,160,67,0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
            aria-label="Nova Análise UAV"
          >
            {analysisLoading ? (
              <>
                <svg
                  style={{
                    animation: "spin 1s linear infinite",
                    width: "15px",
                    height: "15px",
                  }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Iniciando...
              </>
            ) : (
              <>
                <IconPlus className="w-4 h-4" />
                Nova Análise UAV
              </>
            )}
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
          {/* Stats row */}
          <div
            className="fade-in-up"
            style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}
          >
            <StatCard
              label="Área Total Monitorada"
              value="1.248"
              unit="ha"
              color="var(--accent-green)"
            />
            <StatCard
              label="Voos Realizados"
              value="34"
              unit="voos"
              color="#58a6ff"
            />
            <StatCard
              label="NDVI Médio"
              value="0.72"
              unit="índice"
              color="#ffa657"
            />
            <StatCard
              label="Alertas Ativos"
              value="3"
              unit="alertas"
              color="#f85149"
            />
          </div>

          {/* Map Area */}
          <div
            style={{
              flex: 1,
              minHeight: "380px",
              borderRadius: "12px",
              border: "1px solid var(--card-border)",
              background: "var(--card-bg)",
              overflow: "hidden",
            }}
          >
            <MapComponent />
          </div>

          {/* Bottom info strip */}
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
                title: "Cana-de-açúcar",
                desc: "Safra 2025/26 — 980 ha",
              },
              {
                icon: "📡",
                title: "Último voo",
                desc: "23/08/2026 às 07:14",
              },
              {
                icon: "☀️",
                title: "Condições",
                desc: "Céu limpo · Vento 12 km/h",
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

      {/* Spin keyframe via style tag */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

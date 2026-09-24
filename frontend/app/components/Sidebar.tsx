"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Icons ─────────────────────────────────────────────────────────────────────
export function IconScan({ className = "" }: { className?: string }) {
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
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 16v3M12 5v3M16 12h3M5 12h3" />
    </svg>
  );
}

// Mantido export para compatibilidade com outros arquivos se necessário
export const IconDrone = IconScan;

export function IconMap({ className = "" }: { className?: string }) {
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

export function IconChart({ className = "" }: { className?: string }) {
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

export function IconLeaf({ className = "" }: { className?: string }) {
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

export function IconAlert({ className = "" }: { className?: string }) {
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
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 1 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function IconLayers({ className = "" }: { className?: string }) {
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

export function IconHistory({ className = "" }: { className?: string }) {
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

export function IconSettings({ className = "" }: { className?: string }) {
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

export function IconX({ className = "" }: { className?: string }) {
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

export function IconCheck({ className = "" }: { className?: string }) {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function IconPlus({ className = "" }: { className?: string }) {
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

export function IconMenu({ className = "" }: { className?: string }) {
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

export function IconUploadCloud({ className = "" }: { className?: string }) {
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
      <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
      <path d="M12 12v9" />
      <path d="m8 16 4-4 4 4" />
    </svg>
  );
}

export function IconFileImage({ className = "" }: { className?: string }) {
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
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

// ── Tipagem dos Itens de Navegação ─────────────────────────────────────────────
export interface NavItem {
  id: string;
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// ── Lista de itens da barra lateral ───────────────────────────────────────────
export const navItems: NavItem[] = [
  { id: "deteccao", href: "/", label: "Detecção de Daninhas", icon: IconScan },
  { id: "historico", href: "/historico", label: "Histórico de Capturas", icon: IconHistory },

  /* ── Abas comentadas temporariamente (retornar caso necessário) ──
  { id: "analises", href: "/", label: "Análises de Campo", icon: IconChart },
  { id: "culturas", href: "/", label: "Cana-de-Açúcar", icon: IconLeaf },
  { id: "alertas", href: "/", label: "Alertas de Infestação", icon: IconAlert, badge: 3 },
  ── */

  { id: "amostras", href: "/amostras", label: "Banco de Amostras", icon: IconLayers },
];

export function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

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
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
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
              <IconScan className="w-5 h-5 text-white" />
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
                SugarVision IA
              </div>
            </div>
          </Link>
        )}

        {collapsed && (
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
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
              <IconScan className="w-5 h-5 text-white" />
            </div>
          </Link>
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
            const isActive =
              item.href === "/"
                ? pathname === "/" && item.id === "deteccao"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                id={`nav-${item.id}`}
                href={item.href}
                className="nav-item"
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
                  textDecoration: "none",
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
              </Link>
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
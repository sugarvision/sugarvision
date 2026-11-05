"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { API_URL } from "../../lib/env";

export interface SystemSettings {
  apiUrl: string;
  forceDemoMode: boolean;
  confidenceThreshold: number;
  enableSahiTiling: boolean;
  defaultAreaM2: number;
  defaultVariedade: string;
  defaultTalhao: string;
  highContrast: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  apiUrl: API_URL || "http://127.0.0.1:8000",
  forceDemoMode: false,
  confidenceThreshold: 50,
  enableSahiTiling: true,
  defaultAreaM2: 1.0,
  defaultVariedade: "BRS Pastoreio",
  defaultTalhao: "Talhão EXP-01 (Embrapa Norte)",
  highContrast: false,
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiOnline?: boolean | null;
}

export default function SettingsModal({
  isOpen,
  onClose,
  apiOnline,
}: SettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("sugarvision_system_settings");
        if (saved) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch (e) {
        console.debug("Configurações locais não carregadas:", e);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sugarvision_system_settings", JSON.stringify(settings));
      window.dispatchEvent(new CustomEvent("sugarvision_settings_updated"));
    }
    toast.success("Configurações do sistema salvas com sucesso!", {
      theme: "dark",
      autoClose: 2500,
    });
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== "undefined") {
      localStorage.removeItem("sugarvision_system_settings");
      window.dispatchEvent(new CustomEvent("sugarvision_settings_updated"));
    }
    toast.info("Configurações restauradas para os padrões de fábrica.", {
      theme: "dark",
      autoClose: 2500,
    });
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="modal-backdrop-animate no-print"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(10, 15, 25, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content-animate"
        style={{
          background: "var(--card-bg, #161b22)",
          border: "1px solid var(--card-border, #30363d)",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "540px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          color: "var(--foreground, #e6edf3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--sidebar-border)", paddingBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(46, 160, 67, 0.15)",
                border: "1px solid rgba(46, 160, 67, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-green)",
              }}
            >
              ⚙️
            </div>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>
                Configurações do Sistema
              </h2>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "2px 0 0 0" }}>
                Parâmetros de IA, Modo Demonstração e Protocolo Agronômico
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        {/* 1. Status da Conexão & Modo Demonstração */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "10px",
            padding: "14px",
            border: "1px solid var(--card-border)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
              Status da Conexão
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                fontWeight: 700,
                padding: "2px 8px",
                borderRadius: "999px",
                background: apiOnline ? "rgba(46, 160, 67, 0.15)" : "rgba(210, 153, 34, 0.15)",
                color: apiOnline ? "#3fb950" : "#d29922",
                border: `1px solid ${apiOnline ? "rgba(46, 160, 67, 0.3)" : "rgba(210, 153, 34, 0.3)"}`,
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: apiOnline ? "#3fb950" : "#d29922",
                }}
              />
              {apiOnline ? "API Online / Conectada" : "Modo Demonstração Ativo"}
            </span>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--foreground)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
              Endereço da API FastAPI:
            </label>
            <input
              type="text"
              value={settings.apiUrl}
              onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
              placeholder="http://127.0.0.1:8000"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "6px",
                background: "var(--card-bg)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
                fontSize: "12.5px",
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px" }}>
            <input
              type="checkbox"
              checked={settings.forceDemoMode}
              onChange={(e) => setSettings({ ...settings, forceDemoMode: e.target.checked })}
              style={{ accentColor: "var(--accent-green)", cursor: "pointer" }}
            />
            <span>Forçar Modo Demonstração (ignora conexão remota e usa dados locais de contingência)</span>
          </label>
        </div>

        {/* 2. Parâmetros de Inferência YOLOv8x */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "10px",
            padding: "14px",
            border: "1px solid var(--card-border)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
            Visão Computacional & Modelo IA
          </span>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
              <label style={{ fontSize: "12px", color: "var(--foreground)", fontWeight: 600 }}>
                Limiar Mínimo de Confiança (Confidence Score):
              </label>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--accent-green)" }}>
                {settings.confidenceThreshold}%
              </span>
            </div>
            <input
              type="range"
              min="25"
              max="95"
              step="5"
              value={settings.confidenceThreshold}
              onChange={(e) => setSettings({ ...settings, confidenceThreshold: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--accent-green)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)" }}>
              <span>25% (Alta Sensibilidade)</span>
              <span>50% (Padrão Calibrado)</span>
              <span>95% (Máxima Exigência)</span>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12.5px" }}>
            <input
              type="checkbox"
              checked={settings.enableSahiTiling}
              onChange={(e) => setSettings({ ...settings, enableSahiTiling: e.target.checked })}
              style={{ accentColor: "var(--accent-green)", cursor: "pointer" }}
            />
            <span>Ativar Fatiamento Inteligente (SAHI Tiling) para espigas distantes em alta resolução</span>
          </label>
        </div>

        {/* 3. Parâmetros Agronômicos da Embrapa Trigo */}
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "10px",
            padding: "14px",
            border: "1px solid var(--card-border)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <span style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
            Padrões Agronômicos (Embrapa Trigo)
          </span>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                Enquadramento Padrão:
              </label>
              <select
                value={settings.defaultAreaM2}
                onChange={(e) => setSettings({ ...settings, defaultAreaM2: Number(e.target.value) })}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value={1.0}>1.0 m² (Amostragem Padrão)</option>
                <option value={2.0}>2.0 m² (Enquadramento Médio)</option>
                <option value={2.5}>2.5 m² (Enquadramento Amplo)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: "11px", color: "var(--muted)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                Cultivar de Trigo:
              </label>
              <select
                value={settings.defaultVariedade}
                onChange={(e) => setSettings({ ...settings, defaultVariedade: e.target.value })}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  background: "var(--card-bg)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "12px",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="BRS Pastoreio">BRS Pastoreio (Embrapa)</option>
                <option value="TBIO Sintonia">TBIO Sintonia</option>
                <option value="BRS Belamar">BRS Belamar (Irrigado)</option>
                <option value="BRS 264">BRS 264</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rodapé e Ações */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "1px solid var(--card-border)",
              color: "var(--muted)",
              borderRadius: "6px",
              padding: "8px 14px",
              fontSize: "12px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Restaurar Padrões
          </button>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--card-border)",
                color: "var(--foreground)",
                borderRadius: "6px",
                padding: "8px 16px",
                fontSize: "12.5px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSave}
              style={{
                background: "var(--accent-green)",
                border: "none",
                color: "#ffffff",
                borderRadius: "6px",
                padding: "8px 18px",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(46, 160, 67, 0.4)",
              }}
            >
              Salvar Alterações
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}


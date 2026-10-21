"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { authFetch } from "../../lib/supabase/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

// Função geradora de ícones dinâmicos Leaflet baseados na densidade de trigo
function getWheatPin(total_espigas: number) {
  let bg = "#2ea043"; // Verde (Alta densidade)
  let border = "#3fb950";

  if (total_espigas < 20) {
    bg = "#f85149"; // Vermelho (Baixa densidade / falha de estande)
    border = "#ff7b72";
  } else if (total_espigas <= 50) {
    bg = "#d29922"; // Âmbar (Média densidade)
    border = "#e3b341";
  }

  return L.divIcon({
    className: "custom-drone-pin",
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${bg};
        border: 2px solid #ffffff;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.55);
        cursor: pointer;
        color: #ffffff;
        font-weight: 800;
        font-size: 11px;
        line-height: 1;
        transition: transform 0.15s ease;
      " title="Espigas detectadas: ${total_espigas}">
        ${total_espigas}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

interface WheatSampleMapItem {
  id: string;
  nome_amostra: string;
  total_espigas: number;
  densidade_estimada?: string;
  data?: string;
  latitude?: number | null;
  longitude?: number | null;
  filename?: string;
  image_url?: string;
}

export default function FieldMap() {
  const [samples, setSamples] = useState<WheatSampleMapItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros do Mapa
  const [periodoFilter, setPeriodoFilter] = useState<"todas" | "7dias" | "30dias" | "custom">("todas");
  const [dataInicio, setDataInicio] = useState<string>("");
  const [dataFim, setDataFim] = useState<string>("");
  const [densidadeFilter, setDensidadeFilter] = useState<"todas" | "alta" | "media" | "baixa">("todas");
  const [buscaNome, setBuscaNome] = useState<string>("");
  const [apenasMaisRecente, setApenasMaisRecente] = useState<boolean>(false);

  // Ponto central padrão de lavouras monitoradas (Rio Claro - SP)
  const defaultCenter: [number, number] = [-22.4105, -47.5610];

  useEffect(() => {
    async function loadMapData() {
      try {
        const res = await fetch(`${API_URL}/api/historico`).catch(() => null);
        
        if (res && res.ok) {
          const data = await res.json();
          const items: WheatSampleMapItem[] = (Array.isArray(data) ? data : []).map(
            (item: any, idx: number) => {
              // Distribuição sutil ao redor do centro caso a amostra não venha com GPS
              const fallbackLat = defaultCenter[0] + (idx * 0.0018 * 0.002);
              const fallbackLng = defaultCenter[1] + (idx * 0.0022 * 0.002);

              return {
                id: String(item.id || idx),
                nome_amostra: item.nome_amostra || item.nome_imagem || item.nomeImagem || `Amostra #${idx + 1}`,
                total_espigas: item.total_espigas ?? item.focos_detectados ?? item.focosDetectados ?? 0,
                densidade_estimada: item.densidade_estimada || "Densidade Média",
                data: item.data || item.created_at || new Date().toISOString(),
                latitude: typeof item.latitude === "number" ? item.latitude : fallbackLat,
                longitude: typeof item.longitude === "number" ? item.longitude : fallbackLng,
                filename: item.nome_imagem || item.nomeImagem || item.filename || "campo_talhao_01_rioclaro_foto.jpg",
                image_url: item.image_url,
              };
            }
          );

          setSamples(items);
        }
      } catch (err) {
        console.warn("Falha ao carregar amostras de trigo para o mapa:", err);
      } finally {
        setLoading(false);
      }
    }

    loadMapData();
  }, []);

  // Lista base (com fallback demo se o banco ainda estiver vazio)
  const baseSamples = samples.length > 0 ? samples : [
    {
      id: "demo-wheat-01",
      nome_amostra: "Área de Trigo 01 (Talhão Norte)",
      total_espigas: 64,
      densidade_estimada: "Alta Densidade",
      data: new Date().toISOString(),
      latitude: defaultCenter[0],
      longitude: defaultCenter[1],
      filename: "campo_talhao_01_rioclaro_foto.jpg",
    },
    {
      id: "demo-wheat-02",
      nome_amostra: "Área de Trigo 01 (Inspeção Anterior)",
      total_espigas: 42,
      densidade_estimada: "Densidade Média",
      data: new Date(Date.now() - 14 * 86400000).toISOString(),
      latitude: defaultCenter[0], // Mesma coordenada para testar sobreposição
      longitude: defaultCenter[1],
      filename: "campo_talhao_01_rioclaro_foto.jpg",
    },
    {
      id: "demo-wheat-03",
      nome_amostra: "Área de Trigo 02 (Talhão Sul)",
      total_espigas: 18,
      densidade_estimada: "Baixa Densidade",
      data: new Date(Date.now() - 3 * 86400000).toISOString(),
      latitude: defaultCenter[0] + 0.0018,
      longitude: defaultCenter[1] - 0.0015,
      filename: "campo_talhao_01_rioclaro_foto.jpg",
    },
  ];

  // ── Filtragem Dinâmica ──────────────────────────────
  let filtered = baseSamples.filter((amostra) => {
    // 1. Filtro de Período
    const amostraDateStr = amostra.data ? amostra.data.slice(0, 10) : "";
    const amostraTime = amostra.data ? new Date(amostra.data).getTime() : Date.now();

    if (periodoFilter === "7dias") {
      const diasAtras = (Date.now() - amostraTime) / (1000 * 60 * 60 * 24);
      if (diasAtras > 7) return false;
    } else if (periodoFilter === "30dias") {
      const diasAtras = (Date.now() - amostraTime) / (1000 * 60 * 60 * 24);
      if (diasAtras > 30) return false;
    } else if (periodoFilter === "custom") {
      if (dataInicio && amostraDateStr < dataInicio) return false;
      if (dataFim && amostraDateStr > dataFim) return false;
    }

    // 2. Filtro de Densidade
    if (densidadeFilter !== "todas") {
      const densLower = (amostra.densidade_estimada || "").toLowerCase();
      if (densidadeFilter === "alta" && !densLower.includes("alta") && amostra.total_espigas <= 50) return false;
      if (densidadeFilter === "media" && !densLower.includes("méd") && !densLower.includes("med") && (amostra.total_espigas < 20 || amostra.total_espigas > 50)) return false;
      if (densidadeFilter === "baixa" && !densLower.includes("baixa") && amostra.total_espigas >= 20) return false;
    }

    // 3. Busca por Nome / Talhão
    if (buscaNome.trim()) {
      const termo = buscaNome.toLowerCase();
      if (!amostra.nome_amostra.toLowerCase().includes(termo)) return false;
    }

    return true;
  });

  // 4. Modo: Apenas a análise mais recente de cada coordenada geográfica (evita sobreposições idênticas)
  if (apenasMaisRecente) {
    const coordsMap = new Map<string, WheatSampleMapItem>();
    // Ordenar do mais novo para o mais velho
    const sorted = [...filtered].sort((a, b) => {
      const timeA = a.data ? new Date(a.data).getTime() : 0;
      const timeB = b.data ? new Date(b.data).getTime() : 0;
      return timeB - timeA;
    });

    for (const item of sorted) {
      // Arredonda para 4 casas decimais para agrupar pontos no mesmo local (~11 metros)
      const key = `${item.latitude?.toFixed(4)},${item.longitude?.toFixed(4)}`;
      if (!coordsMap.has(key)) {
        coordsMap.set(key, item);
      }
    }
    filtered = Array.from(coordsMap.values());
  }

  const displaySamples = filtered;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* ── Painel Flutuante de Filtros Temporais e de Inspeção ── */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "16px",
          zIndex: 1000,
          background: "rgba(22, 27, 34, 0.92)",
          backdropFilter: "blur(10px)",
          border: "1px solid var(--card-border)",
          borderRadius: "10px",
          padding: "12px 16px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          minWidth: "260px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Filtros da Plantação
          </span>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--accent-green)", background: "rgba(46,160,67,0.15)", padding: "2px 8px", borderRadius: "10px" }}>
            {displaySamples.length} {displaySamples.length === 1 ? "ponto" : "pontos"}
          </span>
        </div>

        {/* Filtro 1: Período da Coleta */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--foreground)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
            Período da Análise:
          </label>
          <select
            value={periodoFilter}
            onChange={(e) => setPeriodoFilter(e.target.value as any)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "6px",
              background: "var(--surface)",
              border: "1px solid var(--card-border)",
              color: "var(--foreground)",
              fontSize: "12px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="todas">Todas as Coletas (Histórico Completo)</option>
            <option value="7dias">Últimos 7 dias (Inspeções Recentes)</option>
            <option value="30dias">Últimos 30 dias (Safra Atual)</option>
            <option value="custom">📅 Período Específico (De / Até)</option>
          </select>
        </div>

        {/* Inputs de Data Personalizada (De / Até) */}
        {periodoFilter === "custom" && (
          <div style={{ display: "flex", gap: "6px", background: "rgba(0,0,0,0.2)", padding: "6px", borderRadius: "6px" }}>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>De:</span>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px",
                  borderRadius: "4px",
                  background: "var(--surface)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "11px",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: "10px", color: "var(--muted)", display: "block" }}>Até:</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                style={{
                  width: "100%",
                  padding: "4px",
                  borderRadius: "4px",
                  background: "var(--surface)",
                  border: "1px solid var(--card-border)",
                  color: "var(--foreground)",
                  fontSize: "11px",
                }}
              />
            </div>
          </div>
        )}

        {/* Filtro 2: Densidade de Espigas */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--foreground)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
            Densidade de Espigas:
          </label>
          <select
            value={densidadeFilter}
            onChange={(e) => setDensidadeFilter(e.target.value as any)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "6px",
              background: "var(--surface)",
              border: "1px solid var(--card-border)",
              color: "var(--foreground)",
              fontSize: "12px",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value="todas">Todas as Densidades</option>
            <option value="alta">🟢 Alta Densidade (&gt; 50 espigas)</option>
            <option value="media">🟡 Densidade Média (20 - 50 espigas)</option>
            <option value="baixa">🔴 Baixa Densidade (&lt; 20 espigas)</option>
          </select>
        </div>

        {/* Filtro 3: Busca por Talhão / Amostra */}
        <div>
          <label style={{ fontSize: "11px", color: "var(--foreground)", display: "block", marginBottom: "4px", fontWeight: 600 }}>
            Filtrar por Talhão:
          </label>
          <input
            type="text"
            placeholder="Ex: Talhão Norte..."
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            style={{
              width: "100%",
              padding: "6px 8px",
              borderRadius: "6px",
              background: "var(--surface)",
              border: "1px solid var(--card-border)",
              color: "var(--foreground)",
              fontSize: "12px",
              outline: "none",
            }}
          />
        </div>

        {/* Controle Anti-Sobreposição: Apenas Última Verificação */}
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "11.5px",
            color: "var(--foreground)",
            cursor: "pointer",
            paddingTop: "4px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <input
            type="checkbox"
            checked={apenasMaisRecente}
            onChange={(e) => setApenasMaisRecente(e.target.checked)}
            style={{ cursor: "pointer", accentColor: "var(--accent-green)" }}
          />
          <span>Apenas última inspeção por local</span>
        </label>
      </div>
      <MapContainer
        center={defaultCenter}
        zoom={16}
        maxZoom={21}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", zIndex: 1 }}
      >
        <LayersControl position="topright">
          {/* Camada 1: Satélite Google (Alta resolução aproximada) */}
          <LayersControl.BaseLayer checked name="Satélite Google">
            <TileLayer
              attribution="&copy; Google Maps"
              url="https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
              maxNativeZoom={20}
              maxZoom={21}
            />
          </LayersControl.BaseLayer>

          {/* Camada 2: Satélite Esri (com upscale automático para não dar tela cinza) */}
          <LayersControl.BaseLayer name="Satélite Esri (UAV)">
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxNativeZoom={17}
              maxZoom={21}
            />
          </LayersControl.BaseLayer>

          {/* Camada 3: Mapa de Ruas / Estradas */}
          <LayersControl.BaseLayer name="Ruas e Rodovias">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxNativeZoom={19}
              maxZoom={21}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* ── Marcadores Dinâmicos de Amostras de Trigo Coletadas ── */}
        {displaySamples.map((amostra) => {
          const lat = amostra.latitude || defaultCenter[0];
          const lng = amostra.longitude || defaultCenter[1];

          return (
            <Marker key={amostra.id} position={[lat, lng]} icon={getWheatPin(amostra.total_espigas)}>
              <Popup>
                <div style={{ padding: "6px", width: "220px", fontSize: "12px", color: "#0d1117" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700, fontSize: "13px", color: "#2ea043" }}>
                      🌾 Trigo (YOLOv8x)
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 6px",
                        borderRadius: "10px",
                        background:
                          amostra.total_espigas >= 50
                            ? "#dafbe1"
                            : amostra.total_espigas >= 20
                            ? "#fff8c5"
                            : "#ffebe9",
                        color:
                          amostra.total_espigas >= 50
                            ? "#1a7f37"
                            : amostra.total_espigas >= 20
                            ? "#9a6700"
                            : "#cf222e",
                      }}
                    >
                      {amostra.total_espigas >= 50 ? "Alta" : amostra.total_espigas >= 20 ? "Média" : "Baixa"}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "12px", color: "#24292f" }}>
                    {amostra.nome_amostra}
                  </div>
                  <div style={{ margin: "6px 0", padding: "6px", background: "#f6f8fa", borderRadius: "6px", border: "1px solid #d0d7de" }}>
                    <div><strong>Contagem:</strong> <span style={{ color: "#0969da", fontWeight: 700 }}>{amostra.total_espigas} espigas</span></div>
                    {amostra.densidade_estimada && (
                      <div style={{ fontSize: "11px", color: "#57606a", marginTop: "2px" }}>
                        Densidade: <strong>{amostra.densidade_estimada}</strong>
                      </div>
                    )}
                    <div style={{ fontSize: "10.5px", color: "#57606a", marginTop: "2px" }}>
                      📅 Data: {amostra.data?.slice(0, 10)}
                    </div>
                  </div>
                  <Link
                    href={`/?amostra=${encodeURIComponent(amostra.filename || "campo_talhao_01_rioclaro_foto.jpg")}&analise_id=${encodeURIComponent(amostra.id)}`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      background: "#2ea043",
                      color: "#ffffff",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      textDecoration: "none",
                      fontWeight: 600,
                      fontSize: "11.5px",
                      marginTop: "6px",
                    }}
                  >
                    Ver Detecção desta Foto
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
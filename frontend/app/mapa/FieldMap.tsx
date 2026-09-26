"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, LayersControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";

// Correção do ícone do Leaflet
const customDronePin = L.divIcon({
  className: "custom-drone-pin",
  html: `
    <div style="
      width: 32px;
      height: 32px;
      background: #2ea043;
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.5);
      cursor: pointer;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -18],
});

interface AnomalyData {
  id: string;
  name: string;
  type: string;
  severity: "alta" | "media" | "baixa";
  coordinates: [number, number][];
  customAreaM2?: number;
}

export default function FieldMap() {
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);

  // Ponto central da Fazenda (Rio Claro - SP)
  const defaultCenter: [number, number] = [-22.4105, -47.5610];

  useEffect(() => {
    async function loadMapData() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/anomalies");
        if (res.ok) {
          const data = await res.json();
          setAnomalies(data);
        }
      } catch (err) {
        console.warn("Usando anomalias locais de campo:", err);
      }
    }
    loadMapData();
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
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

        {/* ── Polígonos de Falhas / Daninhas nos Talhões ── */}
        {anomalies.map((anom) => {
          const isHigh = anom.severity === "alta";
          return (
            <Polygon
              key={anom.id}
              positions={anom.coordinates}
              pathOptions={{
                color: isHigh ? "#f85149" : "#d29922",
                fillColor: isHigh ? "#f85149" : "#d29922",
                fillOpacity: 0.45,
                weight: 2,
              }}
            >
              <Popup>
                <div style={{ padding: "4px", fontSize: "12px", color: "#0d1117" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
                    🌿 {anom.name || "Área Inspecionada"}
                  </div>
                  <div>Tipo: <strong>{anom.type}</strong></div>
                  <div>Severidade: <strong style={{ color: isHigh ? "#da3633" : "#d29922" }}>{anom.severity?.toUpperCase()}</strong></div>
                  {anom.customAreaM2 && (
                    <div>Área: <strong>{(anom.customAreaM2 / 10000).toFixed(2)} ha</strong> ({anom.customAreaM2} m²)</div>
                  )}
                </div>
              </Popup>
            </Polygon>
          );
        })}

        {/* ── Marcador de Ponto de Captura da Foto de Campo ── */}
        <Marker position={[-22.4102, -47.5615]} icon={customDronePin}>
          <Popup>
            <div style={{ padding: "6px", width: "190px", fontSize: "12px", color: "#0d1117" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "#2ea043" }}>
                📍 Ponto de Inspeção UAV
              </div>
              <p style={{ margin: "4px 0 8px 0", fontSize: "11px", color: "#57606a" }}>
                Talhão 01 - Rio Claro (Cana Soca)
              </p>
              <Link
                href="/?amostra=cana_teste.jpg"
                style={{
                  display: "block",
                  textAlign: "center",
                  background: "#2ea043",
                  color: "#ffffff",
                  padding: "5px 10px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "11.5px",
                }}
              >
                Ver Detecção desta Foto
              </Link>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
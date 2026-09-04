'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { TalhaoData, PolygonGeometry, metersToHectares, calculateGeodesicPolygonAreaM2, formatNumberBR } from './utils/geoMath';

// Corrige os ícones do mapa no navegador
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Componente para animar e reposicionar o mapa quando o talhão selecionado mudar
function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [center, zoom, map]);

  return null;
}

interface MapComponentProps {
  talhao?: TalhaoData;
  onSelectFalha?: (falha: PolygonGeometry) => void;
}

export default function MapComponent({ talhao }: MapComponentProps) {
  // Padrão: centro de Rio Claro - SP
  const center: [number, number] = talhao ? talhao.center : [-22.4117, -47.5614];
  const zoomLevel = talhao ? talhao.zoom : 14;

  return (
    <div style={{ height: '100%', width: '100%', minHeight: '400px', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', minHeight: '400px', borderRadius: '12px' }}
      >
        <MapViewController center={center} zoom={zoomLevel} />

        {/* Mapa de Satélite de Alta Resolução Esri */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {talhao && (
          <>
            {/* Polígono do Talhão Total */}
            <Polygon
              positions={talhao.boundary}
              pathOptions={{
                color: '#2ea043',
                weight: 2.5,
                fillColor: '#2ea043',
                fillOpacity: 0.12,
                dashArray: '5 5',
              }}
            >
              <Tooltip sticky>
                <div style={{ fontSize: '12px', fontWeight: 600 }}>
                  🌾 {talhao.nome}
                  <div style={{ fontSize: '11px', color: '#555' }}>
                    Área Total: {talhao.customTotalAreaM2 ? formatNumberBR(talhao.customTotalAreaM2 / 10000, 1) : ''} ha
                  </div>
                </div>
              </Tooltip>
              <Popup>
                <div style={{ color: '#0d1117' }}>
                  <h3 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700 }}>
                    {talhao.nome}
                  </h3>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>
                    <strong>Cultura:</strong> {talhao.cultura} ({talhao.variedade})
                  </p>
                  <p style={{ margin: '0 0 4px 0', fontSize: '12px' }}>
                    <strong>Localização:</strong> {talhao.cidade}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px' }}>
                    <strong>Data do Voo:</strong> {talhao.dataMapeamento}
                  </p>
                </div>
              </Popup>
            </Polygon>

            {/* Polígonos das Falhas de Plantio Detectadas */}
            {talhao.falhas.map((falha) => {
              const areaM2 =
                falha.customAreaM2 !== undefined
                  ? falha.customAreaM2
                  : calculateGeodesicPolygonAreaM2(falha.coordinates);
              const areaHa = metersToHectares(areaM2);

              return (
                <Polygon
                  key={falha.id}
                  positions={falha.coordinates}
                  pathOptions={{
                    color: '#f85149',
                    weight: 2,
                    fillColor: '#da3633',
                    fillOpacity: 0.65,
                  }}
                >
                  <Tooltip sticky>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#900' }}>
                      ⚠️ {falha.name}
                      <div style={{ fontSize: '11px', color: '#333' }}>
                        Área: {formatNumberBR(areaHa, 2)} ha ({formatNumberBR(areaM2, 0)} m²)
                      </div>
                    </div>
                  </Tooltip>
                  <Popup>
                    <div style={{ color: '#0d1117' }}>
                      <h4 style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#da3633', fontWeight: 700 }}>
                        ⚠️ {falha.name}
                      </h4>
                      <div style={{ fontSize: '12px', lineHeight: '1.4' }}>
                        <div><strong>Tipo:</strong> Falha de Plantio (Gaps)</div>
                        <div><strong>Severidade:</strong> <span style={{ textTransform: 'capitalize', color: falha.severity === 'alta' ? '#da3633' : '#d29922' }}>{falha.severity}</span></div>
                        <div><strong>Área Calculada:</strong> {formatNumberBR(areaHa, 2)} Hectares ({formatNumberBR(areaM2, 0)} m²)</div>
                        <div><strong>Ação Recomendada:</strong> Replantio localizado via UAV</div>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}
          </>
        )}

        {/* Marcador Central */}
        <Marker position={center}>
          <Popup>
            <div style={{ color: '#0d1117' }}>
              <strong>{talhao ? talhao.nome : 'Polo Rio Claro'}</strong><br />
              {talhao ? talhao.cidade : 'Centro de Operações SugarVision'}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
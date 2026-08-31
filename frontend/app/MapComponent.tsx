'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Corrige os ícones do mapa no navegador
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapComponent() {
  // Coordenadas exatas do centro de Rio Claro - SP
  const center: [number, number] = [-22.4117, -47.5614];
  const zoomLevel = 13; // Zoom ideal para ver a malha urbana da cidade inteira

  return (
    <div style={{ height: '100%', width: '100%', minHeight: '380px' }}>
      <MapContainer
        center={center}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', minHeight: '380px', borderRadius: '12px' }}
      >
        {/* Mapa de Satélite */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        
        {/* Marcador em Rio Claro */}
        <Marker position={center}>
          <Popup>
            <strong>Rio Claro - SP</strong><br />Polo Canavieiro SugarVision
          </Popup>
        </Marker>

        {/* Marcador em Piracicaba */}
        <Marker position={[-22.7253, -47.6492]}>
          <Popup>
            <strong>Piracicaba - SP</strong><br />Região de Monitoramento
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
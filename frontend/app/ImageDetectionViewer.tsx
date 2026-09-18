'use client';

import { useState, useEffect } from 'react';

export interface WeedDetection {
  id: string | number;
  label: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ImageDetectionViewerProps {
  imageSrc?: string;
}

// Detecções padrão de demonstração para quando o backend não retornar dados
const DEFAULT_DETECTIONS: WeedDetection[] = [
  {
    id: 1,
    label: 'Erva Daninha: Braquiária',
    confidence: 0.94,
    box: { x: 22, y: 35, width: 18, height: 22 },
  },
  {
    id: 2,
    label: 'Erva Daninha: Capim-Colonião',
    confidence: 0.88,
    box: { x: 55, y: 18, width: 20, height: 25 },
  },
  {
    id: 3,
    label: 'Erva Daninha: Corda-de-Viola',
    confidence: 0.91,
    box: { x: 40, y: 62, width: 16, height: 20 },
  },
];

export default function ImageDetectionViewer({
  imageSrc = '/cana_teste.jpg',
}: ImageDetectionViewerProps) {
  const [detections, setDetections] = useState<WeedDetection[]>(DEFAULT_DETECTIONS);
  const [selectedDetection, setSelectedDetection] = useState<WeedDetection | null>(null);

  useEffect(() => {
    async function fetchDetections() {
      try {
        const res = await fetch('http://localhost:8000/api/anomalies');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.detections || data.anomalies || [];
          
          if (list.length > 0) {
            // Normaliza cada item para garantir que sempre tenha a propriedade box válida
            const normalizedList: WeedDetection[] = list.map((item: any, index: number) => {
              const box = item.box || {
                x: item.x ?? item.left ?? 20,
                y: item.y ?? item.top ?? 20,
                width: item.width ?? item.w ?? 15,
                height: item.height ?? item.h ?? 15,
              };

              return {
                id: item.id ?? index + 1,
                label: item.label ?? item.name ?? 'Erva Daninha Detectada',
                confidence: typeof item.confidence === 'number' ? item.confidence : 0.90,
                box: {
                  x: Number(box.x) || 0,
                  y: Number(box.y) || 0,
                  width: Number(box.width) || 10,
                  height: Number(box.height) || 10,
                },
              };
            });

            setDetections(normalizedList);
            return;
          }
        }
      } catch {
        // Em caso de erro na requisição, mantém as detecções padrão
      }

      setDetections(DEFAULT_DETECTIONS);
    }

    fetchDetections();
  }, [imageSrc]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '420px',
        background: '#0d1117',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '12px',
      }}
    >
      {/* Container da Imagem com as Caixas de Seleção */}
      <div
        style={{
          position: 'relative',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'inline-block',
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt="Monitoramento UAV - Detecção de Ervas Daninhas"
          style={{
            maxWidth: '100%',
            maxHeight: '520px',
            objectFit: 'contain',
            display: 'block',
            borderRadius: '8px',
          }}
          onError={(e) => {
            // Imagem de contingência caso a foto padrão não seja encontrada no disco
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80';
          }}
        />

        {/* Caixas Delimitadoras (Bounding Boxes) */}
        {detections.map((det) => {
          const isSelected = selectedDetection?.id === det.id;
          const boxX = det.box?.x ?? 0;
          const boxY = det.box?.y ?? 0;
          const boxW = det.box?.width ?? 10;
          const boxH = det.box?.height ?? 10;

          return (
            <div
              key={det.id}
              onClick={() => setSelectedDetection(isSelected ? null : det)}
              style={{
                position: 'absolute',
                left: `${boxX}%`,
                top: `${boxY}%`,
                width: `${boxW}%`,
                height: `${boxH}%`,
                border: isSelected ? '3px solid #ffcc00' : '2px solid #f85149',
                backgroundColor: isSelected
                  ? 'rgba(255, 204, 0, 0.25)'
                  : 'rgba(248, 81, 73, 0.2)',
                cursor: 'pointer',
                borderRadius: '4px',
                boxShadow: isSelected
                  ? '0 0 12px rgba(255,204,0,0.8)'
                  : '0 0 8px rgba(248,81,73,0.5)',
                transition: 'all 0.15s ease-in-out',
                zIndex: isSelected ? 20 : 10,
              }}
              title={`${det.label} (${(det.confidence * 100).toFixed(0)}%)`}
            >
              {/* Etiqueta da Caixa Delimitadora */}
              <div
                style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '-2px',
                  background: isSelected ? '#ffcc00' : '#f85149',
                  color: isSelected ? '#000000' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2',
                }}
              >
                🌿 {det.label} ({(det.confidence * 100).toFixed(0)}%)
              </div>
            </div>
          );
        })}
      </div>

      {/* Indicador de Status no Canto Inferior */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          background: 'rgba(22, 27, 34, 0.85)',
          backdropFilter: 'blur(6px)',
          border: '1px solid var(--card-border)',
          borderRadius: '8px',
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: 'var(--foreground)',
          zIndex: 30,
        }}
      >
        <span
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#f85149',
          }}
        />
        <span>
          <strong>{detections.length}</strong> Focos de Ervas Daninhas Detectados
        </span>
      </div>
    </div>
  );
}
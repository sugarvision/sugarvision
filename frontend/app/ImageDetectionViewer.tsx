'use client';

import { useState, useEffect } from 'react';

export interface WeedDetection {
  id: string | number;
  label: string;
  confidence: number;
  type?: string;
  severity?: 'baixa' | 'media' | 'alta' | string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ImageDetectionViewerProps {
  imageSrc?: string;
  detections?: WeedDetection[];
}

// Detecções padrão de demonstração para quando o backend não retornar dados
const DEFAULT_DETECTIONS: WeedDetection[] = [
  {
    id: 1,
    label: 'Erva Daninha: Braquiária',
    confidence: 0.94,
    type: 'erva_daninha',
    severity: 'alta',
    box: { x: 22, y: 35, width: 18, height: 22 },
  },
  {
    id: 2,
    label: 'Erva Daninha: Capim-Colonião',
    confidence: 0.88,
    type: 'erva_daninha',
    severity: 'media',
    box: { x: 55, y: 18, width: 20, height: 25 },
  },
  {
    id: 3,
    label: 'Erva Daninha: Corda-de-Viola',
    confidence: 0.91,
    type: 'erva_daninha',
    severity: 'alta',
    box: { x: 40, y: 62, width: 16, height: 20 },
  },
];

export default function ImageDetectionViewer({
  imageSrc = '/cana_teste.jpg',
  detections: propDetections,
}: ImageDetectionViewerProps) {
  const [detections, setDetections] = useState<WeedDetection[]>(propDetections || DEFAULT_DETECTIONS);
  const [selectedDetection, setSelectedDetection] = useState<WeedDetection | null>(null);

  useEffect(() => {
    if (propDetections !== undefined) {
      setDetections(propDetections);
      setSelectedDetection(null);
      return;
    }

    async function fetchDetections() {
      try {
        const res = await fetch('http://localhost:8000/api/anomalies');
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.detections || data.anomalies || [];
          
          if (list.length > 0) {
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
                type: item.type ?? 'erva_daninha',
                severity: item.severity ?? 'media',
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
  }, [propDetections, imageSrc]);

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
          const isWeed = det.type !== 'cana_de_acucar';
          const boxColor = isWeed ? '#f85149' : '#2ea043';
          const bgOpacity = isWeed ? 'rgba(248, 81, 73, 0.22)' : 'rgba(46, 160, 67, 0.2)';
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
                border: isSelected ? '3px solid #ffcc00' : `2px solid ${boxColor}`,
                backgroundColor: isSelected
                  ? 'rgba(255, 204, 0, 0.28)'
                  : bgOpacity,
                cursor: 'pointer',
                borderRadius: '4px',
                boxShadow: isSelected
                  ? '0 0 14px rgba(255,204,0,0.9)'
                  : `0 0 8px ${isWeed ? 'rgba(248,81,73,0.5)' : 'rgba(46,160,67,0.4)'}`,
                transition: 'all 0.15s ease-in-out',
                zIndex: isSelected ? 25 : 10,
              }}
              title={`${det.label} (${(det.confidence * 100).toFixed(0)}%) - Severidade: ${det.severity || 'n/a'}`}
            >
              {/* Etiqueta da Caixa Delimitadora */}
              <div
                style={{
                  position: 'absolute',
                  top: '-24px',
                  left: '-2px',
                  background: isSelected ? '#ffcc00' : boxColor,
                  color: isSelected ? '#000000' : '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                  lineHeight: '1.2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                }}
              >
                <span>{isWeed ? '🌿' : '🌱'}</span>
                <span>{det.label}</span>
                <span style={{ opacity: 0.9 }}>({(det.confidence * 100).toFixed(0)}%)</span>
                {det.severity && (
                  <span
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      padding: '1px 4px',
                      borderRadius: '2px',
                      textTransform: 'uppercase',
                      fontSize: '9px',
                    }}
                  >
                    {det.severity}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

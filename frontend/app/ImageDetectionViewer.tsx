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

export default function ImageDetectionViewer({
  imageSrc,
  detections: propDetections,
}: ImageDetectionViewerProps) {
  const [detections, setDetections] = useState<WeedDetection[]>(propDetections || []);
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(imageSrc);

  // Sincroniza displaySrc sempre que a prop imageSrc for atualizada
  useEffect(() => {
    setDisplaySrc(imageSrc);
  }, [imageSrc]);

  useEffect(() => {
    if (propDetections !== undefined) {
      setDetections(propDetections);
      return;
    }

    if (!imageSrc) {
      setDetections([]);
      return;
    }

    async function fetchDetections() {
      try {
        let res = await fetch('http://127.0.0.1:8000/api/anomalies').catch(() => null);
        if (!res || !res.ok) {
          res = await fetch('http://localhost:8000/api/anomalies').catch(() => null);
        }
        if (res && res.ok) {
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

      setDetections([]);
    }

    fetchDetections();
  }, [propDetections, imageSrc]);

  const handleImageError = () => {
    // Tenta carregar do diretório público local com o mesmo nome exato
    if (!imageSrc || !displaySrc) return;
    const filename = imageSrc.split("/").pop()?.split("?")[0];
    if (filename && !displaySrc.startsWith("/") && !displaySrc.startsWith("blob:")) {
      setDisplaySrc(`/${decodeURIComponent(filename)}`);
      return;
    }
  };

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
      {displaySrc ? (
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
            key={displaySrc}
            src={displaySrc}
            alt="Imagem aérea do campo com detecção de cabeças de trigo"
            style={{
              maxWidth: '100%',
              maxHeight: '520px',
              objectFit: 'contain',
              display: 'block',
              borderRadius: '8px',
            }}
            onError={handleImageError}
          />

          {/* Caixas Delimitadoras (Bounding Boxes) */}
          {detections.map((det) => {
          const boxX = det.box?.x ?? 0;
          const boxY = det.box?.y ?? 0;
          const boxW = det.box?.width ?? 10;
          const boxH = det.box?.height ?? 10;

            return (
              <div
                key={det.id}
                style={{
                  position: 'absolute',
                  left: `${boxX}%`,
                  top: `${boxY}%`,
                  width: `${boxW}%`,
                  height: `${boxH}%`,
                  border: '2px solid #f85149',
                  backgroundColor: 'transparent',
                  borderRadius: '1px',
                  zIndex: 10,
                }}
              />
            );
          })}
        </div>
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
          Selecione uma imagem para iniciar a análise.
        </div>
      )}
    </div>
  );
}

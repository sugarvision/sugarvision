// ── Estruturas de Dados para Detecção de Ervas Daninhas em Fotos Aproximadas ──

export interface WeedDetectionItem {
  id: string | number;
  name: string;
  species: string; // Ex: Braquiária, Capim-Colonião, Corda-de-Viola
  severity: "alta" | "media" | "baixa";
  confidence: number; // 0.0 a 1.0
  areaFoliarM2: number; // Área em m² ocupada pela erva na foto (ex: 0.15 m²)
}

export interface AmostraData {
  id: string;
  nome: string;
  cultura: string;
  variedade: string;
  cidade: string;
  dataCaptura: string;
  areaAmostraM2: number; // Ex: 2.5 m² (enquadramento aproximado da foto)
  daninhas: WeedDetectionItem[];
}

export function formatNumberBR(value: number, decimals: number = 1): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Mock de Amostras de Campo (Fotos de Perto) ────────────────────────────────
export const TALHOES_MOCK_DATA: AmostraData[] = [
  {
    id: "talhao-01-rio-claro",
    nome: "Amostra 01 — Fazenda Boa Vista",
    cultura: "Cana-de-açúcar",
    variedade: "CTC-9001 (Plena Safra)",
    cidade: "Rio Claro - SP",
    dataCaptura: "04/09/2026",
    areaAmostraM2: 2.5, // 2,5 m² na foto
    daninhas: [
      { id: "w-1", name: "Braquiária", species: "Brachiaria decumbens", severity: "alta", confidence: 0.94, areaFoliarM2: 0.28 },
      { id: "w-2", name: "Capim-Colonião", species: "Panicum maximum", severity: "media", confidence: 0.88, areaFoliarM2: 0.12 },
      { id: "w-3", name: "Corda-de-Viola", species: "Ipomoea purpurea", severity: "alta", confidence: 0.91, areaFoliarM2: 0.06 },
    ],
  },
  {
    id: "talhao-02-piracicaba",
    nome: "Amostra 02 — Polo Piracicaba",
    cultura: "Cana-de-açúcar",
    variedade: "RB867515 (Cana Soca)",
    cidade: "Piracicaba - SP",
    dataCaptura: "03/09/2026",
    areaAmostraM2: 2.0,
    daninhas: [
      { id: "w-4", name: "Braquiária", species: "Brachiaria decumbens", severity: "alta", confidence: 0.93, areaFoliarM2: 0.22 },
      { id: "w-5", name: "Caruru", species: "Amaranthus hybridus", severity: "baixa", confidence: 0.85, areaFoliarM2: 0.08 },
    ],
  },
  {
    id: "talhao-03-araras",
    nome: "Amostra 03 — Fazenda São Martinho",
    cultura: "Cana-de-açúcar",
    variedade: "IACSP95-5000",
    cidade: "Araras - SP",
    dataCaptura: "01/09/2026",
    areaAmostraM2: 3.0,
    daninhas: [
      { id: "w-6", name: "Corda-de-Viola", species: "Ipomoea purpurea", severity: "media", confidence: 0.89, areaFoliarM2: 0.18 },
    ],
  },
];

// ── Cálculo Matemático das Métricas da Foto ──────────────────────────────────
export function computeFieldMetrics(amostra: AmostraData) {
  const totalFotoM2 = amostra.areaAmostraM2;
  const infestacaoM2 = amostra.daninhas.reduce((acc, curr) => acc + curr.areaFoliarM2, 0);
  const canaSaudavelM2 = Math.max(0, totalFotoM2 - infestacaoM2);
  const percentualInfestacao = (infestacaoM2 / totalFotoM2) * 100;
  const percentualSaudavel = (canaSaudavelM2 / totalFotoM2) * 100;
  const mediaConfianca =
    amostra.daninhas.length > 0
      ? (amostra.daninhas.reduce((acc, curr) => acc + curr.confidence, 0) / amostra.daninhas.length) * 100
      : 0;

  return {
    totalFotoM2,
    infestacaoM2,
    canaSaudavelM2,
    percentualInfestacao,
    percentualSaudavel,
    totalFocos: amostra.daninhas.length,
    mediaConfianca,
    // Alias para manter compatibilidade
    totalFieldHa: totalFotoM2,
    totalFieldM2: totalFotoM2,
    failureHa: infestacaoM2,
    failureM2: infestacaoM2,
    failurePercent: percentualInfestacao,
    productiveHa: canaSaudavelM2,
    standPercent: percentualSaudavel,
    failureCount: amostra.daninhas.length,
  };
}
// ── Estruturas de Dados Agronômicos e Geoespaciais de Talhões (Embrapa Trigo) ──

export interface WeedDetectionItem {
  id: string | number;
  name: string;
  species: string;
  severity: "alta" | "media" | "baixa";
  confidence: number; // 0.0 a 1.0
  areaFoliarM2: number;
}

export interface AmostraData {
  id: string;
  talhaoCodigo: string;
  nome: string;
  cultura: string;
  variedade: string;
  cultivar: string;
  cidade: string;
  dataCaptura: string;
  areaAmostraM2: number;
  latitude: number;
  longitude: number;
  daninhas: WeedDetectionItem[];
}

export function formatNumberBR(value: number, decimals: number = 1): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Catálogo de Talhões Experimentais (Embrapa Trigo - Passo Fundo / RS) ─────
export const TALHOES_MOCK_DATA: AmostraData[] = [
  {
    id: "EXP-01",
    talhaoCodigo: "EXP-01",
    nome: "Talhão Experimental 01 (Embrapa Trigo - Setor Norte)",
    cultura: "Trigo (Triticum aestivum)",
    variedade: "BRS Pastoreio",
    cultivar: "BRS Pastoreio",
    cidade: "Passo Fundo - RS (Embrapa Trigo)",
    dataCaptura: "08/11/2026",
    areaAmostraM2: 1.0,
    latitude: -28.2178,
    longitude: -52.4075,
    daninhas: [],
  },
  {
    id: "EXP-02",
    talhaoCodigo: "EXP-02",
    nome: "Talhão Experimental 02 (Embrapa Trigo - Setor Sul)",
    cultura: "Trigo (Triticum aestivum)",
    variedade: "TBIO Sintonia",
    cultivar: "TBIO Sintonia",
    cidade: "Passo Fundo - RS (Embrapa Trigo)",
    dataCaptura: "08/11/2026",
    areaAmostraM2: 1.0,
    latitude: -28.2238,
    longitude: -52.4080,
    daninhas: [],
  },
  {
    id: "EXP-03",
    talhaoCodigo: "EXP-03",
    nome: "Talhão Experimental 03 (Ensaio Irrigado Embrapa Leste)",
    cultura: "Trigo (Triticum aestivum)",
    variedade: "BRS Belamar",
    cultivar: "BRS Belamar",
    cidade: "Passo Fundo - RS (Embrapa Trigo)",
    dataCaptura: "08/11/2026",
    areaAmostraM2: 1.0,
    latitude: -28.2205,
    longitude: -52.4008,
    daninhas: [],
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

/**
 * Módulo de Geometria e Cálculos Matemáticos para o SugarVision
 *
 * Responsável pelo cálculo geodésico de áreas de talhões e polígonos de falhas de plantio (m² e hectares),
 * além da consolidação estatística de estande, perdas e produtividade.
 */

export interface PolygonGeometry {
  id: string;
  name: string;
  type: "falha_plantio" | "erva_daninha" | "replantio";
  severity: "baixa" | "media" | "alta";
  coordinates: [number, number][]; // Array de [latitude, longitude]
  customAreaM2?: number; // Permite calibrar a área exata ou computar via coordenadas
}

export interface TalhaoData {
  id: string;
  nome: string;
  cultura: string;
  variedade: string;
  cidade: string;
  dataMapeamento: string;
  center: [number, number];
  zoom: number;
  boundary: [number, number][]; // Polígono delimitador do talhão
  customTotalAreaM2?: number;
  falhas: PolygonGeometry[];
}

export interface FieldMetrics {
  totalFieldM2: number;
  totalFieldHa: number;
  failureM2: number;
  failureHa: number;
  failureCount: number;
  failurePercent: number;
  productiveHa: number;
  standPercent: number;
}

/**
 * Calcula a área real de um polígono na superfície esférica da Terra em metros quadrados.
 * Utiliza o algoritmo geodésico esférico de Shoelace baseado no raio médio da Terra (WGS-84 R = 6.378.137m).
 *
 * @param coords Lista ordenada de coordenadas [latitude, longitude] do polígono
 * @returns Área em metros quadrados (m²)
 */
export function calculateGeodesicPolygonAreaM2(coords: [number, number][]): number {
  if (!coords || coords.length < 3) return 0;

  const RADIUS = 6378137; // Raio da Terra em metros
  let total = 0;
  const len = coords.length;

  for (let i = 0; i < len; i++) {
    const p1 = coords[i];
    const p2 = coords[(i + 1) % len];

    const lat1 = (p1[0] * Math.PI) / 180;
    const lng1 = (p1[1] * Math.PI) / 180;
    const lat2 = (p2[0] * Math.PI) / 180;
    const lng2 = (p2[1] * Math.PI) / 180;

    total += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  const areaM2 = Math.abs((total * RADIUS * RADIUS) / 2);
  return areaM2;
}

/**
 * Converte área de metros quadrados para Hectares.
 * 1 Hectare = 10.000 m²
 */
export function metersToHectares(metersSquared: number): number {
  return metersSquared / 10000;
}

/**
 * Função matemática em Javascript que itera e soma o tamanho (área em metros/hectares)
 * de todos os polígonos de falha carregados.
 *
 * @param polygons Lista de polígonos de falha
 */
export function calculateTotalFailureArea(polygons: PolygonGeometry[]): {
  totalM2: number;
  totalHectares: number;
  count: number;
} {
  let totalM2 = 0;

  for (const poly of polygons) {
    // Se o polígono tiver área customizada predefinida (calibração), usa-a; senão calcula via geodésia
    if (poly.customAreaM2 !== undefined && poly.customAreaM2 > 0) {
      totalM2 += poly.customAreaM2;
    } else {
      totalM2 += calculateGeodesicPolygonAreaM2(poly.coordinates);
    }
  }

  return {
    totalM2,
    totalHectares: metersToHectares(totalM2),
    count: polygons.length,
  };
}

/**
 * Calcula todas as métricas dinâmicas do talhão selecionado:
 * - Total Analisado (Hectares e m²)
 * - Falhas de Plantio (Hectares, m² e %)
 * - Área Produtiva Efetiva (Hectares e %)
 */
export function computeFieldMetrics(talhao: TalhaoData): FieldMetrics {
  const totalFieldM2 =
    talhao.customTotalAreaM2 !== undefined && talhao.customTotalAreaM2 > 0
      ? talhao.customTotalAreaM2
      : calculateGeodesicPolygonAreaM2(talhao.boundary);

  const totalFieldHa = metersToHectares(totalFieldM2);

  const failureStats = calculateTotalFailureArea(talhao.falhas);
  const failureM2 = failureStats.totalM2;
  const failureHa = failureStats.totalHectares;
  const failureCount = failureStats.count;

  const failurePercent = totalFieldHa > 0 ? (failureHa / totalFieldHa) * 100 : 0;
  const productiveHa = Math.max(0, totalFieldHa - failureHa);
  const standPercent = totalFieldHa > 0 ? (productiveHa / totalFieldHa) * 100 : 0;

  return {
    totalFieldM2,
    totalFieldHa,
    failureM2,
    failureHa,
    failureCount,
    failurePercent,
    productiveHa,
    standPercent,
  };
}

/**
 * Formata números com padrão brasileiro (ex: 50,0 ou 1.248,50)
 */
export function formatNumberBR(val: number, decimals: number = 1): string {
  return val.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ── Banco de Dados Mock de Talhões e Falhas de Plantio ─────────────────────────
export const TALHOES_MOCK_DATA: TalhaoData[] = [
  {
    id: "talhao-01-rio-claro",
    nome: "Talhão 01 — Fazenda Boa Vista",
    cultura: "Cana-de-açúcar",
    variedade: "CTC-9001 (Plena Safra)",
    cidade: "Rio Claro - SP",
    dataMapeamento: "04/09/2026",
    center: [-22.4117, -47.5614],
    zoom: 14,
    // Área calibrada exatamente para 50.0 Hectares (500.000 m²)
    customTotalAreaM2: 500000,
    boundary: [
      [-22.404, -47.568],
      [-22.404, -47.555],
      [-22.419, -47.555],
      [-22.419, -47.568],
    ],
    // Falhas de plantio somando exatamente 4.0 Hectares (40.000 m² = 8.0%)
    falhas: [
      {
        id: "falha-01",
        name: "Falha Setor Norte - Linha 12 a 18",
        type: "falha_plantio",
        severity: "alta",
        customAreaM2: 15000, // 1.5 ha
        coordinates: [
          [-22.406, -47.565],
          [-22.406, -47.56],
          [-22.409, -47.56],
          [-22.409, -47.565],
        ],
      },
      {
        id: "falha-02",
        name: "Falha Setor Leste - Erosão Hídrica",
        type: "falha_plantio",
        severity: "media",
        customAreaM2: 13000, // 1.3 ha
        coordinates: [
          [-22.412, -47.559],
          [-22.412, -47.556],
          [-22.416, -47.556],
          [-22.416, -47.559],
        ],
      },
      {
        id: "falha-03",
        name: "Falha Setor Sul - Reboleira e Compactação",
        type: "falha_plantio",
        severity: "alta",
        customAreaM2: 12000, // 1.2 ha
        coordinates: [
          [-22.415, -47.566],
          [-22.415, -47.562],
          [-22.418, -47.562],
          [-22.418, -47.566],
        ],
      },
    ],
  },
  {
    id: "talhao-02-piracicaba",
    nome: "Talhão 02 — Polo Piracicaba",
    cultura: "Cana-de-açúcar",
    variedade: "RB867515 (Cana Soca)",
    cidade: "Piracicaba - SP",
    dataMapeamento: "03/09/2026",
    center: [-22.7253, -47.6492],
    zoom: 14,
    customTotalAreaM2: 850000, // 85.0 Hectares
    boundary: [
      [-22.718, -47.658],
      [-22.718, -47.64],
      [-22.733, -47.64],
      [-22.733, -47.658],
    ],
    falhas: [
      {
        id: "falha-pira-01",
        name: "Falha de Germinação — Colmo Fraco",
        type: "falha_plantio",
        severity: "alta",
        customAreaM2: 25500, // 2.55 ha
        coordinates: [
          [-22.721, -47.654],
          [-22.721, -47.648],
          [-22.725, -47.648],
          [-22.725, -47.654],
        ],
      },
      {
        id: "falha-pira-02",
        name: "Falha por Matocompetição",
        type: "falha_plantio",
        severity: "media",
        customAreaM2: 17000, // 1.70 ha
        coordinates: [
          [-22.727, -47.646],
          [-22.727, -47.642],
          [-22.731, -47.642],
          [-22.731, -47.646],
        ],
      },
      {
        id: "falha-pira-03",
        name: "Falha Setor Oeste",
        type: "falha_plantio",
        severity: "baixa",
        customAreaM2: 8500, // 0.85 ha
        coordinates: [
          [-22.728, -47.656],
          [-22.728, -47.652],
          [-22.731, -47.652],
          [-22.731, -47.656],
        ],
      },
    ],
  },
  {
    id: "talhao-03-araras",
    nome: "Talhão 03 — Fazenda São Martinho",
    cultura: "Cana-de-açúcar",
    variedade: "IACSP95-5000",
    cidade: "Araras - SP",
    dataMapeamento: "01/09/2026",
    center: [-22.357, -47.384],
    zoom: 14,
    customTotalAreaM2: 1200000, // 120.0 Hectares
    boundary: [
      [-22.348, -47.395],
      [-22.348, -47.373],
      [-22.366, -47.373],
      [-22.366, -47.395],
    ],
    falhas: [
      {
        id: "falha-ara-01",
        name: "Falha Extensa por Ataque de Pragas",
        type: "falha_plantio",
        severity: "alta",
        customAreaM2: 48000, // 4.8 ha
        coordinates: [
          [-22.352, -47.391],
          [-22.352, -47.382],
          [-22.358, -47.382],
          [-22.358, -47.391],
        ],
      },
      {
        id: "falha-ara-02",
        name: "Falha no Espaçamento de Linhas",
        type: "falha_plantio",
        severity: "media",
        customAreaM2: 24000, // 2.4 ha
        coordinates: [
          [-22.36, -47.381],
          [-22.36, -47.376],
          [-22.364, -47.376],
          [-22.364, -47.381],
        ],
      },
    ],
  },
];

/**
 * Utilitário de exportação tabular em formato .CSV para o histórico de amostras.
 * Compatível com Microsoft Excel, LibreOffice Calc e Google Sheets (RFC 4180 com UTF-8 BOM).
 */

export interface CsvSampleRow {
  id: string;
  dataCaptura?: string;
  horaCaptura?: string;
  created_at?: string;
  nomeImagem: string;
  talhaoId?: string;
  talhaoNome?: string;
  cidade?: string;
  variedade?: string;
  areaAmostraM2?: number;
  focosDetectados?: number;
  total_espigas?: number;
  densidade_estimada?: number;
  status?: string;
  formato?: string;
  tamanhoArquivo?: string;
  latitude?: number;
  longitude?: number;
}

export function exportSamplesToCsv(
  samples: CsvSampleRow[],
  filenamePrefix: string = "sugarvision_laudos_trigo"
) {
  if (!samples || samples.length === 0) {
    throw new Error("Nenhuma amostra disponível para exportação.");
  }

  // Cabeçalhos formais em português para o operador agronômico
  const headers = [
    "ID da Análise",
    "Data da Coleta",
    "Hora",
    "Arquivo de Imagem",
    "Talhão / Parcela",
    "Localização (Embrapa Trigo)",
    "Latitude",
    "Longitude",
    "Cultura / Variedade",
    "Área Amostrada (m²)",
    "Espigas Contadas (YOLOv8x)",
    "Densidade (espigas/m²)",
    "Projeção (espigas/ha)",
    "Classificação do Estande",
    "Formato do Arquivo",
    "Tamanho do Arquivo",
    "Modelo de IA Utilizado",
  ];

  // Helper para escapar campos no padrão RFC 4180 com separador ';' comum em Excel pt-BR
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = samples.map((s) => {
    // Formatação de data/hora
    let data = s.dataCaptura || "";
    let hora = s.horaCaptura || "";
    if (s.created_at) {
      try {
        const localIso = s.created_at.replace("Z", "").split("+")[0];
        const d = new Date(localIso);
        data = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
        hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      } catch {
        // mantém o fallback
      }
    }

    const espigas = s.total_espigas ?? s.focosDetectados ?? 0;
    const area = s.areaAmostraM2 && s.areaAmostraM2 > 0 ? s.areaAmostraM2 : 1.0;
    const densidadeM2 = s.densidade_estimada ? s.densidade_estimada : (espigas / area);
    const projecaoHa = Math.round(densidadeM2 * 10000);

    const lat = s.latitude ?? -28.2234;
    const lon = s.longitude ?? -52.4076;

    let classificacao = "Satisfatório";
    if (densidadeM2 >= 60) {
      classificacao = "Excelente / Alta Densidade";
    } else if (densidadeM2 < 30) {
      classificacao = "Baixo / Atenção";
    }

    return [
      escapeCell(s.id),
      escapeCell(data || "Hoje"),
      escapeCell(hora || "--:--"),
      escapeCell(s.nomeImagem),
      escapeCell(s.talhaoNome || "Talhão Experimental 01 (Embrapa Trigo)"),
      escapeCell(s.cidade || "Passo Fundo - RS (Embrapa Trigo)"),
      escapeCell(lat.toFixed(6)),
      escapeCell(lon.toFixed(6)),
      escapeCell(s.variedade || "BRS Pastoreio"),
      escapeCell(area.toFixed(2)),
      escapeCell(espigas),
      escapeCell(densidadeM2.toFixed(1)),
      escapeCell(projecaoHa),
      escapeCell(s.status || classificacao),
      escapeCell(s.formato || "JPG"),
      escapeCell(s.tamanhoArquivo || "1.5 MB"),
      escapeCell("YOLOv8x Calibrado (Embrapa Trigo)"),
    ].join(";");
  });

  // UTF-8 BOM (\uFEFF) para garantir acentuação correta no Microsoft Excel
  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const downloadLink = document.createElement("a");

  downloadLink.href = url;
  downloadLink.setAttribute("download", `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}


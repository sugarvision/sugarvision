/**
 * Utilitário leve para extração de coordenadas GPS (EXIF) diretamente de imagens JPEG/TIFF no navegador.
 * Não requer dependências externas pesadas e roda 100% no cliente.
 */

export interface ExifGpsCoords {
  latitude: number;
  longitude: number;
}

export async function extractGpsFromImage(file: File): Promise<ExifGpsCoords | null> {
  try {
    // Ler os primeiros 128 KB da imagem (geralmente onde fica o cabeçalho EXIF/APP1)
    const blob = file.slice(0, 131072);
    const buffer = await blob.arrayBuffer();
    const data = new DataView(buffer);

    // Verificar assinatura JPEG: 0xFFD8
    if (data.getUint16(0) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = data.byteLength;

    while (offset < length) {
      if (data.getUint8(offset) !== 0xff) {
        break;
      }

      const marker = data.getUint8(offset + 1);

      // APP1 Marker (EXIF) é 0xFFE1
      if (marker === 0xe1) {
        const app1Length = data.getUint16(offset + 2);
        const exifHeader = offset + 4;

        // Verificar header "Exif\0\0" (0x45786966 0x0000)
        if (
          data.getUint32(exifHeader) === 0x45786966 &&
          data.getUint16(exifHeader + 4) === 0x0000
        ) {
          const tiffStart = exifHeader + 6;
          return parseTiffGps(data, tiffStart);
        }

        offset += 2 + app1Length;
      } else if ((marker & 0xff00) === 0xff00 && marker !== 0xd8 && marker !== 0xd9) {
        // Outros marcadores JPEG
        offset += 2 + data.getUint16(offset + 2);
      } else {
        break;
      }
    }
  } catch (err) {
    console.debug("Imagem sem cabeçalho EXIF GPS:", err);
  }

  return null;
}

function parseTiffGps(data: DataView, tiffStart: number): ExifGpsCoords | null {
  // Identificar endianness: 'II' (0x4949 - Little Endian) ou 'MM' (0x4D4D - Big Endian)
  const byteOrder = data.getUint16(tiffStart);
  const littleEndian = byteOrder === 0x4949;

  // Verificar número 42 da especificação TIFF
  if (data.getUint16(tiffStart + 2, littleEndian) !== 0x002a) {
    return null;
  }

  const ifd0Offset = data.getUint32(tiffStart + 4, littleEndian);
  const ifd0Start = tiffStart + ifd0Offset;
  const numEntries = data.getUint16(ifd0Start, littleEndian);

  let gpsInfoOffset = 0;

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifd0Start + 2 + i * 12;
    const tag = data.getUint16(entryOffset, littleEndian);

    // Tag 0x8825 = GPSInfo IFD Pointer
    if (tag === 0x8825) {
      gpsInfoOffset = data.getUint32(entryOffset + 8, littleEndian);
      break;
    }
  }

  if (gpsInfoOffset === 0) return null;

  const gpsStart = tiffStart + gpsInfoOffset;
  const numGpsEntries = data.getUint16(gpsStart, littleEndian);

  let latRef = "N";
  let lngRef = "E";
  let latDegrees: number[] | null = null;
  let lngDegrees: number[] | null = null;

  for (let i = 0; i < numGpsEntries; i++) {
    const entryOffset = gpsStart + 2 + i * 12;
    const tag = data.getUint16(entryOffset, littleEndian);

    if (tag === 1) {
      // GPSLatitudeRef
      latRef = String.fromCharCode(data.getUint8(entryOffset + 8));
    } else if (tag === 2) {
      // GPSLatitude
      const valOffset = tiffStart + data.getUint32(entryOffset + 8, littleEndian);
      latDegrees = readRationals(data, valOffset, 3, littleEndian);
    } else if (tag === 3) {
      // GPSLongitudeRef
      lngRef = String.fromCharCode(data.getUint8(entryOffset + 8));
    } else if (tag === 4) {
      // GPSLongitude
      const valOffset = tiffStart + data.getUint32(entryOffset + 8, littleEndian);
      lngDegrees = readRationals(data, valOffset, 3, littleEndian);
    }
  }

  if (latDegrees && lngDegrees) {
    let lat = latDegrees[0] + latDegrees[1] / 60 + latDegrees[2] / 3600;
    let lng = lngDegrees[0] + lngDegrees[1] / 60 + lngDegrees[2] / 3600;

    if (latRef === "S") lat = -lat;
    if (lngRef === "W") lng = -lng;

    if (!isNaN(lat) && !isNaN(lng)) {
      return {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
      };
    }
  }

  return null;
}

function readRationals(data: DataView, offset: number, count: number, littleEndian: boolean): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const num = data.getUint32(offset + i * 8, littleEndian);
    const den = data.getUint32(offset + i * 8 + 4, littleEndian);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}

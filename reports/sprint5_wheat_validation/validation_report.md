# Relatório de Validação Funcional da IA de Trigo - Sprint 5

- **Data da Avaliação:** 2026-10-13 11:57:21
- **Modelo:** `best.pt` (YOLOv8x - 130.47 MB)
- **Classe Única Validada:** `{0: 'wheat'}`
- **Total de Imagens Avaliadas:** 20
- **Total de Espigas de Trigo Detectadas:** 456
- **Confiança Média Global:** 68.04%
- **Limiar Mínimo de Confiança:** $\ge 0.40$
- **Endpoint `/upload` FastAPI:** Validado com sucesso (HTTP 201)

## Tabela de Resultados por Imagem

| Imagem | Espigas Detectadas | Conf. Média | Conf. Mínima | Conf. Máxima | Tempo (ms) | Pares Sobrepostos |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `00319488e879a811698174d9f...` | 9 | 0.52 | 0.41 | 0.73 | 3626.07 | 0 |
| `0045ab3d479309837ba595e10...` | 24 | 0.66 | 0.43 | 0.83 | 2186.81 | 0 |
| `004cf579e4a96bfadc9c626f4...` | 7 | 0.66 | 0.52 | 0.75 | 4264.76 | 0 |
| `00b517a1161844d3002f32ed5...` | 34 | 0.65 | 0.47 | 0.79 | 4535.52 | 0 |
| `00bb861c1f4e7dacc4f04ecd0...` | 25 | 0.71 | 0.40 | 0.82 | 4231.79 | 1 |
| `00c63d3b51b886f9c29ca196e...` | 4 | 0.49 | 0.41 | 0.62 | 4217.25 | 0 |
| `00e6e6ba993877c21066a4050...` | 9 | 0.58 | 0.41 | 0.75 | 4125.51 | 0 |
| `010462ab12092ecc64a291d3f...` | 25 | 0.70 | 0.46 | 0.84 | 4043.68 | 0 |
| `010e77526ec7fe8d14cfc7fbc...` | 11 | 0.72 | 0.67 | 0.79 | 4104.38 | 0 |
| `01254aa643c25894834a62d66...` | 31 | 0.64 | 0.43 | 0.83 | 4095.87 | 0 |
| `01395e349968115fab139dc01...` | 18 | 0.73 | 0.43 | 0.84 | 4251.2 | 0 |
| `013e5a0b57b693b7eda28d192...` | 26 | 0.69 | 0.45 | 0.84 | 4028.12 | 0 |
| `01541decd3f6775b2207415d4...` | 29 | 0.67 | 0.47 | 0.78 | 4003.94 | 1 |
| `01584be6bbe184896fa413d6b...` | 29 | 0.63 | 0.43 | 0.75 | 4095.2 | 0 |
| `018ab5d5af979df0fec62aeee...` | 29 | 0.73 | 0.49 | 0.85 | 4015.65 | 0 |
| `01a489d0a898d2867d70f9242...` | 19 | 0.73 | 0.49 | 0.84 | 3901.55 | 0 |
| `01f03ec5a1af6dc8590bed5f1...` | 38 | 0.66 | 0.42 | 0.81 | 3914.0 | 0 |
| `024838e411bbcac5fea9d262e...` | 43 | 0.72 | 0.44 | 0.84 | 3904.18 | 0 |
| `024f21f0e6b59a0e8c5c18e4b...` | 25 | 0.71 | 0.42 | 0.82 | 4097.39 | 0 |
| `02984f94a65912641b63e9a85...` | 21 | 0.73 | 0.54 | 0.86 | 4250.94 | 1 |

## Casos de Borda para o Pós-Processamento da Sprint 7

Foram identificados **3 registros de borda** (sobreposições e oclusões).

### Imagem: `00bb861c1f4e7dacc4f04ecd0092e348bc08d408d1d98029126adf290b39f3af_png.rf.1606c65c7b62db76a9869e8a03ceb101.jpg`
- **Tipo de Ocorrência:** overlapping_heads (Severidade: medium)
- **Detalhe:** 1 pares de espigas sobrepostas com IoU > 0.30
- **Recomendação para Sprint 7:** Implementar Soft-NMS ou limiar dinâmico de supressão para evitar duplicação ou fusão de contagem.

### Imagem: `01541decd3f6775b2207415d47f9a570be921643c4239572eeadf82c87b762e9_png.rf.554cecc1474f8b5d1d3574ecd9e4fc52.jpg`
- **Tipo de Ocorrência:** overlapping_heads (Severidade: medium)
- **Detalhe:** 1 pares de espigas sobrepostas com IoU > 0.30
- **Recomendação para Sprint 7:** Implementar Soft-NMS ou limiar dinâmico de supressão para evitar duplicação ou fusão de contagem.

### Imagem: `02984f94a65912641b63e9a85b23b04a6a1c542f2db588328c76c9a6b9a44d8c_png.rf.e2a01e001f3a9455a5a5417f66713ec9.jpg`
- **Tipo de Ocorrência:** overlapping_heads (Severidade: medium)
- **Detalhe:** 1 pares de espigas sobrepostas com IoU > 0.30
- **Recomendação para Sprint 7:** Implementar Soft-NMS ou limiar dinâmico de supressão para evitar duplicação ou fusão de contagem.


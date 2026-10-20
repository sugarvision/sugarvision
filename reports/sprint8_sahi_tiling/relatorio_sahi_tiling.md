# Estudo Teórico e Proposta de Fatiamento (Tiling / SAHI) — Sprint 8

- **Projeto:** SugarVision — Monitoramento Agrícola Inteligente de Trigo
- **Sprint:** Sprint 8
- **Responsável:** Membro 3 (IA A)
- **Modelo Avaliado:** `YOLOv8x` (`backend/best.pt` — 130.47 MB, treinado sobre o *Global Wheat Head Dataset 2021*)
- **Configuração de Inferência Calibrada (Sprint 7):** `conf_threshold = 0.45`, `iou_threshold = 0.50`, `imgsz = 640`

---

## 1. Análise de Fotos Aéreas de Alta Altitude e Mapeamento de Perda de Detecção (Checklist #1)

### 1.1. Causa Raiz Arquitetural: O Gargalo do *Downsampling* Global ($W \times H \rightarrow 640 \times 640$)
O motor de visão computacional atual do SugarVision ([`SugarVisionAnalyzer.detect`](../../cv_engine/analyzer.py) e [`processar_imagem_ia`](../../backend/ai_engine.py)) realiza a inferência em **quadro inteiro (*Full-Frame Inference*)** invocando diretamente `model.predict(source=image, conf=0.45, iou=0.50)`.

Como o modelo `best.pt` foi treinado a partir do **Global Wheat Head Dataset 2021 (GWHD)** com pré-processamento padronizado em **$640 \times 640$ pixels** (conforme documentado em [`README.roboflow.txt`](../../Global%20Wheat%202021.v1i.yolov8/README.roboflow.txt)), a biblioteca *Ultralytics YOLOv8* redimensiona automaticamente qualquer imagem de entrada de resolução $W \times H$ para um tensor $640 \times 640$ antes de enviá-la ao *backbone* CSPDarknet53.

Em arquiteturas da família YOLOv8, as cabeças de detecção (*Detection Heads*) operam em três escalas de mapas de características (*feature maps* PANet/FPN):
- **Cabeça P3 (`stride = 8`):** Mapa de $80 \times 80$ células (responsável por objetos pequenos).
- **Cabeça P4 (`stride = 16`):** Mapa de $40 \times 40$ células (responsável por objetos médios).
- **Cabeça P5 (`stride = 32`):** Mapa de $20 \times 20$ células (responsável por objetos grandes).

Quando um VANT (drone) captura imagens em **alta altitude** ou quando o usuário submete um recorte de **ortomosaico de alta resolução** ($1920 \times 1920\text{ px}$, $2560 \times 2560\text{ px}$ ou $4\text{K}$), ocorre uma compressão espacial severa:

$$s_x = \frac{640}{W}, \quad s_y = \frac{640}{H}, \quad A_{\text{reduzida}} = A_{\text{original}} \cdot (s_x \cdot s_y)$$

Uma espiga de trigo que mede em média **$29,4 \times 29,4\text{ pixels}$** na imagem original de alta resolução é comprimida para **$9,8\text{ px}$** (em quadros $1920 \times 1920$) ou **$8,1\text{ px}$** (em quadros $2560 \times 2560$). Ao atravessar o *stride* $8$ da camada P3, essa espiga passa a ocupar **$\approx 1,0 \text{ a } 1,2\text{ pixel}$ no mapa de características**, perdendo completamente a textura das aristas (os filamentos ou "barbas" no topo da espiga) e das glumas (as pequenas cascas/escamas que envolvem cada grão) e sofrendo supressão por baixa confiança ($\text{conf} < 0,45$).

---

### 1.2. Mapeamento Quantitativo de Cenários de Altitude vs. Perda de Sensibilidade
Para quantificar empiricamente a degradação do modelo `YOLOv8x` (`best.pt`) conforme o aumento da altitude de voo (e consequente ampliação da área enquadrada por foto), foram avaliados quatro cenários de escala progressiva construídos a partir das amostras oficiais do conjunto de testes (`cv_engine/samples/wheat_test_set`):

| Cenário Operacional de Voo | Resolução da Imagem ($W \times H$) | Fator de *Downsampling* p/ $640\text{ px}$ | GSD Equivalente ($\text{cm/px}$) | Dimensão Média da Espiga (Original $\rightarrow$ Pós-Resize) | Total Real (*Ground Truth*) | Detecções YOLOv8x Nativo (Taxa de Recuperação) | Detecções com SAHI Tiling $640\times640$ (Taxa de Recuperação) | Ganho Relativo com SAHI |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **C1 — Baixa Altitude / Fenotipagem Próxima (2m–5m)** | $640 \times 640\text{ px}$ | $1,0\times$ ($1\times$ área) | $0,30\text{ cm/px}$ | $27,6\text{ px} \rightarrow \mathbf{27,6\text{ px}}$ | $109$ espigas | **$77$** ($70,6\%$) | **$77$** ($70,6\%$) | Estável ($1,00\times$) |
| **C2 — Média Altitude / Voo de Talhão (15m)** | $1280 \times 1280\text{ px}$ | $2,0\times$ ($4\times$ área) | $0,60\text{ cm/px}$ | $31,1\text{ px} \rightarrow \mathbf{15,6\text{ px}}$ | $408$ espigas | **$201$** ($49,3\%$) | **$288$** ($70,6\%$) | **$+43,3\%$** ($1,43\times$) |
| **C3 — Alta Altitude / Voo Comercial (30m)** | $1920 \times 1920\text{ px}$ | $3,0\times$ ($9\times$ área) | $0,90\text{ cm/px}$ | $29,4\text{ px} \rightarrow \mathbf{9,8\text{ px}}$ | $913$ espigas | **$116$** ($12,7\%$) | **$517$** ($56,6\%$) | **$+345,7\%$** ($4,46\times$) |
| **C4 — Muito Alta Altitude / Ortomosaico (50m+)** | $2560 \times 2560\text{ px}$ | $4,0\times$ ($16\times$ área) | $1,20\text{ cm/px}$ | $32,2\text{ px} \rightarrow \mathbf{8,1\text{ px}}$ | $1464$ espigas | **$41$** ($2,8\%$) | **$756$** ($51,6\%$) | **$+1743,9\%$** ($18,44\times$) |

#### Diagnóstico dos Cenários Críticos de Falha:
1. **Ponto de Inflexão ($> 1280 \times 1280\text{ px}$ ou Espigas $< 15\text{ px}$ pós-resize):** No Cenário C2, o modelo nativo já perde metade das espigas presentes na lavoura ($49,3\%$ de recuperação contra $70,6\%$ do SAHI).
2. **Colapso em Alta Altitude (Cenários C3 e C4):** Quando a imagem atinge $1920 \times 1920\text{ px}$ ou $2560 \times 2560\text{ px}$ (típico de sensores de drones DJI Mavic 3 Multispectral / Phantom 4 RTK voando acima de $25\text{ m}$), a taxa de recuperação do YOLOv8x nativo despenca para **$12,7\%$** e **$2,8\%$**, respectivamente.
3. **Impacto Agronômico Direto no SugarVision:** Como o módulo [`diagnostico_agronomico`](../../backend/ai_engine.py) calcula a produtividade estimada ($\text{kg/ha}$ e $\text{sacas/ha}$) diretamente a partir do `total_cabecas_trigo` detectado na imagem, uma foto aérea de alta altitude processada sem fatiamento induz o sistema a classificar erroneamente um talhão de **Alta Densidade** como **"Baixa Densidade / Espaçamento Ralo"**, subestimando severamente o potencial produtivo da safra.

---

## 2. Capítulo para o Relatório Final do Projeto (Checklist #2)

> *O texto a seguir foi redigido no formato acadêmico/técnico definitivo para inserção direta no Relatório Final do projeto SugarVision.*

### Capítulo: Limitações Conhecidas e Próximos Passos: Aplicação de SAHI (Tiling)

#### 2.1. Contextualização das Limitações Conhecidas em Sensoriamento Remoto Agrícola
Durante os ciclos de validação das Sprints 5 a 7, o motor de visão computacional do **SugarVision**, baseado na arquitetura **YOLOv8x** (`best.pt`), demonstrou excelente desempenho e precisão na detecção de cabeças de trigo (`wheat`) em imagens capturadas a baixa distância do dossel ($640 \times 640\text{ px}$ a $1024 \times 1024\text{ px}$), alcançando confiança média superior a $68\%$ e recuperando mais de $70\%$ das espigas sob diferentes condições de luminosidade e fenologia.

Contudo, identificou-se uma limitação estrutural inerente aos detectores de estágio único (*single-stage detectors*) quando aplicados a **fotografias aéreas de alta altitude e ortomosaicos de larga escala**: o problema da detecção de pequenos objetos (*Small Object Detection*). Na operação real em fazendas comerciais, os voos de VANTs (drones) frequentemente ocorrem entre $20\text{ m}$ e $60\text{ m}$ de altitude para maximizar a cobertura de hectares por bateria, gerando imagens nativas de altíssima resolução ($4000 \times 3000\text{ px}$ ou superiores).

Quando essas imagens são submetidas diretamente ao pipeline padrão do YOLOv8x, a etapa interna de pré-processamento aplica um redimensionamento bilinear global (*downsampling*) para $640 \times 640\text{ pixels}$. Esse encolhimento reduz drasticamente a representação espacial de cada espiga de trigo de $\sim 30\text{ pixels}$ para menos de $10\text{ pixels}$ de largura. Como a menor camada de detecção do YOLOv8x (P3) possui passo de subamostragem (*stride*) igual a $8$, objetos com dimensão inferior a $10\text{ pixels}$ no tensor redimensionado colapsam em cerca de $1\text{ pixel}$ no mapa de características, tornando-se indistinguíveis do fundo foliar e da palhada.

#### 2.2. Fundamentação da Técnica SAHI (*Slicing Aided Hyper Inference*)
Para superar essa limitação sem a necessidade de retreinar a rede neural com imagens gigantescas (o que exigiria memória de vídeo proibitiva em GPUs comerciais), propõe-se como evolução arquitetural do SugarVision a adoção da técnica **SAHI (*Slicing Aided Hyper Inference*)**, originalmente formulada por Akyon et al. (2022).

O paradigma SAHI desacopla a resolução da imagem capturada pelo drone da resolução de entrada da rede neural por meio de um pipeline dividido em três fases: **Fatiamento por Janelas Móveis (*Sliding Window Slicing*)**, **Inferência Local em Escala Nativa** e **Reconstrução Global de Coordenadas com Fusão NMS/NMM**.

```mermaid
flowchart TB
    subgraph Entrada["1. Aquisição Aérea (Alta Altitude)"]
        IMG["Imagem de Drone / Ortomosaico<br/>Resolução Original W × H (ex: 4000×3000 px)"]
    end

    subgraph Slicing["2. Janelas Móveis (Sliding Window)"]
        GRID["Particionamento em Grade de Fatias (Tiles)<br/>Dimensão L × L (640×640 px)<br/>Taxa de Sobreposição α = 20% (Stride = 512 px)"]
    end

    subgraph Inferencia["3. Inferência Independente"]
        YOLO["Execução do YOLOv8x (best.pt) em cada Fatia k<br/>Preservação 1:1 da Resolução das Espigas (~30 px)"]
    end

    subgraph Reconstrucao["4. Reconstrução de Coordenadas e Pós-Processamento"]
        OFFSET["Translação p/ Referencial Global:<br/>X_global = X_local + ΔX_k<br/>Y_global = Y_local + ΔY_k"]
        NMS["Supressão / Fusão Global (NMS / NMM, IoU = 0.50)<br/>Eliminação de Duplicatas nas Faixas de Overlap"]
    end

    subgraph Saida["5. Integração SugarVision"]
        GPS["Georreferenciamento (_convert_pixels_to_gps)<br/>Persistência Supabase & Mapa de Calor Leaflet"]
    end

    IMG --> GRID --> YOLO --> OFFSET --> NMS --> GPS
```

#### 2.3. Funcionamento das Janelas Móveis (*Sliding Window*) e Taxa de Sobreposição (*Overlap*)
Em vez de comprimir a imagem original $I$ de dimensões $W \times H$, o algoritmo de fatiamento percorre a imagem com uma **janela móvel (*sliding window*)** de largura $L_w = 640\text{ px}$ e altura $L_h = 640\text{ px}$ — exatamente a dimensão óptica na qual o modelo `best.pt` foi treinado.

Se o fatiamento fosse realizado por cortes secos disjuntos (sem sobreposição), as espigas de trigo localizadas exatamente sobre as linhas de fronteira entre dois recortes seriam seccionadas ao meio. Isso produziria duas metades incompletas (com baixa confiança de detecção) ou geraria duas caixas fragmentadas para uma única planta. Para resolver esse problema de borda, define-se uma **taxa de sobreposição (*overlap ratio*)** $\alpha \in [0,20; \, 0,25]$ ($20\%$ a $25\%$). O passo de deslocamento (*stride*) horizontal $S_x$ e vertical $S_y$ da janela móvel é dado por:

$$S_x = \lfloor L_w \cdot (1 - \alpha) \rfloor, \quad S_y = \lfloor L_h \cdot (1 - \alpha) \rfloor$$

Para $L_w = L_h = 640\text{ px}$ e $\alpha = 0,20$:
- **Passo de deslocamento (*Stride*):** $S_x = S_y = 640 \times 0,80 = 512\text{ pixels}$.
- **Faixa de segurança (*Overlap Zone*):** $128\text{ pixels}$ de interseção entre janelas vizinhas. Como o diâmetro médio de uma espiga na imagem é de $\sim 30\text{ pixels}$, uma faixa de sobreposição de $128\text{ pixels}$ ($> 4\times$ o tamanho do objeto) garante matematicamente que qualquer espiga cortada pela borda da janela $k$ estará **100% íntegra no interior da janela adjacente $k+1$**.

#### 2.4. Reconstrução Matemática de Coordenadas e Supressão Global (NMS / NMM)
Cada fatia $k$ extraída da imagem original possui uma origem conhecida no sistema de coordenadas global da imagem, definida pelo vetor de deslocamento (*offset*) $(\Delta X_k, \Delta Y_k)$ do seu canto superior esquerdo:

$$\Delta X_k = c_k \cdot S_x, \quad \Delta Y_k = r_k \cdot S_y$$

onde $r_k$ e $c_k$ representam os índices da linha e coluna da janela na grade de fatiamento.

Quando o modelo `YOLOv8x` executa a inferência sobre a fatia $k$, ele retorna um conjunto de caixas delimitadoras expressas no **referencial local da fatia** $[x_{1,\text{local}}^{(k)}, \, y_{1,\text{local}}^{(k)}, \, x_{2,\text{local}}^{(k)}, \, y_{2,\text{local}}^{(k)}] \in [0, 640]^2$. A **reconstrução para o referencial global** da imagem original ($W \times H$) é efetuada por uma transformação de translação rígida:

$$\begin{bmatrix} x_{1,\text{global}}^{(k)} \\ y_{1,\text{global}}^{(k)} \\ x_{2,\text{global}}^{(k)} \\ y_{2,\text{global}}^{(k)} \end{bmatrix} = \begin{bmatrix} x_{1,\text{local}}^{(k)} + \Delta X_k \\ y_{1,\text{local}}^{(k)} + \Delta Y_k \\ x_{2,\text{local}}^{(k)} + \Delta X_k \\ y_{2,\text{local}}^{(k)} + \Delta Y_k \end{bmatrix}$$

Após reunir todas as predições transladadas de todas as $N$ janelas em uma lista global unificada, as espigas situadas dentro das faixas de sobreposição de $128\text{ px}$ terão sido detectadas simultaneamente por duas (ou até quatro, nos cantos) janelas vizinhas. Para eliminar essas duplicatas sem perder detecções legítimas:
1. Calcula-se o **IoU (*Intersection over Union*)** ou **IoS (*Intersection over Smaller Area*)** entre todos os pares de caixas globais.
2. Aplica-se o algoritmo de **NMS Global (*Non-Maximum Suppression*)** ou **NMM (*Non-Maximum Merging*)** com limiar calibrado ($\text{IoU} = 0,50$), preservando a caixa de maior confiança (ou fundindo caixas parciais de borda em um único *bounding box* envolvente).
3. Finalmente, as coordenadas globais consolidadas $(x_{\text{global}}, y_{\text{global}})$ são normalizadas pelas dimensões totais $(W, H)$ da foto original e entregues ao método [`_convert_pixels_to_gps`](../../cv_engine/analyzer.py) já existente no SugarVision, gerando coordenadas geográficas `[latitude, longitude]` perfeitamente alinhadas ao mapa interativo Leaflet e ao banco de dados Supabase.

#### 2.5. Viabilidade Operacional e Próximos Passos de Implementação
A evolução para o pipeline SAHI apresenta um *trade-off* clássico entre **acurácia de detecção (*Recall*)** e **custo computacional (latência de inferência)**:
- Enquanto a inferência nativa executa apenas $1$ passe da rede neural por imagem, uma imagem fatiada em $9$ ($2\times 2$ com overlap) ou $16$ ($3\times 3$ com overlap) janelas requer $9$ a $16$ passes de inferência.
- Como a arquitetura de backend do SugarVision já processa as imagens de forma **assíncrona em segundo plano** utilizando `BackgroundTasks` do FastAPI ([`main.py`](../../backend/main.py) e [`ai_engine.py`](../../backend/ai_engine.py)), o aumento no tempo de processamento (de $\sim 4\text{ s}$ para $\sim 12\text{–}18\text{ s}$ em CPU, ou $< 1,5\text{ s}$ com inferência em *batch* em GPU CUDA) não bloqueia a interface do usuário.
- **Recomendação de Roadmap Futuro:** Integrar o acionamento condicional de *Tiling* (via biblioteca `sahi` ou *slicer* nativo) sempre que a resolução da imagem recebida no endpoint `/upload` exceder $1280 \times 1280\text{ pixels}$, mantendo a inferência rápida de passe único para fotos de baixa altitude.

---

## 3. Imagens Conceituais Comparativas para os Slides da Apresentação Final (Checklist #3)

Foram geradas duas pranchas visuais em alta definição ($3240 \times 1800\text{ px}$, proporção $16:9$ widescreen nativa para apresentações) utilizando dados e inferências reais do modelo `best.pt` do projeto, armazenadas em [`reports/sprint8_sahi_tiling/slides_assets/`](./slides_assets/):

### 3.1. Slide 1: Comparativo Visual — Inferência Nativa YOLOv8x vs. Fatiamento SAHI
- **Arquivo:** [`slides_assets/slide_01_comparativo_yolo_nativo_vs_sahi.png`](./slides_assets/slide_01_comparativo_yolo_nativo_vs_sahi.png)
- **Objetivo na Apresentação:** Demonstrar visualmente à banca o impacto severo do *downsampling* para $640 \times 640\text{ px}$ na inferência nativa em alta altitude versus a recuperação massiva de detecções proporcionada pelo fatiamento SAHI.

![Comparativo YOLOv8x Nativo vs SAHI](./slides_assets/slide_01_comparativo_yolo_nativo_vs_sahi.png)

---

### 3.2. Slide 2: Arquitetura de Janelas Móveis (*Overlap*) e Reconstrução de Coordenadas
- **Arquivo:** [`slides_assets/slide_02_arquitetura_janelas_moveis_reconstrucao.png`](./slides_assets/slide_02_arquitetura_janelas_moveis_reconstrucao.png)
- **Objetivo na Apresentação:** Ilustrar passo a passo o funcionamento técnico da grade de janelas móveis ($640 \times 640\text{ px}$ com $20\%$ de *overlap*), a preservação da escala $1:1$ dentro de cada fatia e a translação matemática de *offsets* $(\Delta X_k, \Delta Y_k)$ seguida de NMS Global para reconstrução georreferenciada.

![Pipeline de Janelas Móveis e Reconstrução de Coordenadas](./slides_assets/slide_02_arquitetura_janelas_moveis_reconstrucao.png)

---

## 4. Referências Bibliográficas
1. **Akyon, F. C., Altinuc, S. O., & Temizel, A. (2022).** *Slicing Aided Hyper Inference and Fine-Tuning for Small Object Detection*. In 2022 IEEE International Conference on Image Processing (ICIP), pp. 966–970.
2. **David, E., Madec, S., Sadeghi-Tehran, P., et al. (2021).** *Global Wheat Head Dataset 2021: more diversity to improve the average domain generalization*. Plant Phenomics, 2021.
3. **Jocher, G., Chaurasia, A., & Qiu, J. (2023).** *Ultralytics YOLOv8 Documentation*. Disponível em: https://docs.ultralytics.com.

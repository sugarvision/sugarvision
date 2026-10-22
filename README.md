<div align="center">

# 🌾 MyAgro — Plataforma de Visão Computacional & Análise UAV

**Monitoramento Agrícola Inteligente, Contagem Automatizada de Espigas de Trigo e Diagnóstico Geoespacial de Precisão**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![YOLOv8x](https://img.shields.io/badge/YOLOv8x-Ultralytics-FF6F00?style=for-the-badge&logo=pytorch&logoColor=white)](https://docs.ultralytics.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-Geospatial-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)

</div>

---

## 📋 Sumário

- [Visão Geral e Proposta de Valor](#-visão-geral-e-proposta-de-valor)
- [Funcionalidades da Aplicação Web](#️-funcionalidades-da-aplicação-web)
- [Arquitetura do Sistema e Regras Agronômicas](#️-arquitetura-do-sistema-e-regras-agronômicas)
- [Estrutura de Diretórios](#-estrutura-de-diretórios)
- [Como Executar Localmente](#-como-executar-localmente)
- [Referência da API (Endpoints)](#-referência-da-api-endpoints)
- [Suíte de Testes e Validação Científica](#-suíte-de-testes-e-validação-científica)
- [Exposição via Cloudflare Tunnel](#️-exposição-via-cloudflare-tunnel-opcional)
- [Referências Científicas](#-referências-científicas)

---

## 📌 Visão Geral e Proposta de Valor

O **MyAgro** é uma solução *full-stack* de agricultura de precisão projetada para automatizar o monitoramento de lavouras a partir de imagens capturadas por VANTs (drones) e sensores de campo.

Utilizando um motor de visão computacional baseado na arquitetura **YOLOv8x (`best.pt`)**, treinado e validado sobre o *Global Wheat Head Dataset 2021 (GWHD)*, a plataforma detecta e contabiliza cabeças de trigo (*Triticum aestivum*) em condições reais de campo (alta luminosidade, luz difusa, estágio vegetativo verde e maturação avançada).

### Principais Diferenciais e Valor Entregue
- **Automação de Fenotipagem e Contagem:** Substitui a amostragem manual em campo pela detecção automatizada da classe única `0: wheat`, extraindo caixas delimitadoras (*bounding boxes*) com coordenadas normalizadas e em pixels.
- **Diagnóstico Agronômico Acionável:** Transforma a contagem bruta de espigas em métricas agronômicas de densidade populacional (`espigas/m²`), classificação qualitativa do estande da lavoura e estimativa direta de produtividade em **`kg/ha`** e **`sacas/ha`**.
- **Rastreabilidade Geoespacial:** Converte detecções em coordenadas geográficas reais (`[latitude, longitude]`) para plotagem em mapas de satélite interativos, permitindo identificar falhas de plantio e zonas de baixa densidade no talhão.
- **Engenharia Resiliente (Offline-First Fallback):** Arquitetura orientada a serviços (SOA) com cache *Singleton* do modelo YOLO em RAM, pool de conexões PostgreSQL IPv4 no Supabase e contingência local automática em JSON para garantir disponibilidade contínua.

---

## 🖥️ Funcionalidades da Aplicação Web

A aplicação frontend foi construída em **Next.js 16 (App Router)** com **React 19** e **TypeScript**, oferecendo uma interface escura de alto contraste voltada para operação técnica e agronômica:

### 1. 🔍 Painel Principal de Inspeção Visual (`/`)
- **Upload de Fotos de Campo:** Envio assíncrono de imagens `.jpg`, `.jpeg` e `.png` (até 20 MB) com validação no cliente e no servidor.
- **Visualizador de Detecções (`ImageDetectionViewer`):** Renderização dinâmica das *bounding boxes* sobre a imagem analisada, mantendo a proporção exata em qualquer resolução de tela.
- **4 KPIs Agronômicos em Tempo Real:**
  1. **Total de Espigas:** Contagem absoluta de cabeças de trigo detectadas na imagem.
  2. **Densidade Estimada:** Cálculo automático de `espigas/m²` com classificação em *Densidade Baixa*, *Densidade Média* ou *Alta Densidade*.
  3. **Confiança Média:** Acurácia média percentual das predições do YOLOv8x com barra de progresso visual.
  4. **Status do Pipeline:** Indicador em tempo real do processamento da IA e gravação no banco.
- **Modal de Detalhes & Cálculo de Área Coberta:** Exibe o tamanho do arquivo, a contagem de espigas e o percentual exato da imagem ocupado pelas caixas delimitadoras (calculado por varredura e união geométrica de intervalos 2D para descontar sobreposições).
- **Emissão de Laudo (`Imprimir Laudo`):** Acionamento nativo de impressão/exportação PDF com layout limpo das métricas e da foto diagnosticada.

### 2. 🗂️ Banco de Amostras (`/amostras`)
- **Integração Direta com PostgreSQL (`tabela: images`):** Listagem sincronizada com indicador visual de status de conexão com o banco Supabase.
- **Modos de Exibição (Cards ou Tabela):** Alternância rápida entre grade visual com miniaturas (com *fallback* resiliente de imagem) e tabela estruturada.
- **Busca e Filtragem Multicritério:** Pesquisa instantânea por nome do arquivo ou UUID, filtro por status (`completed` / `processing`) e filtro por presença de espigas (`Com Espigas > 0` ou `Sem Espigas = 0`).
- **Ações por Amostra:**
  - **Analisar:** Envia a amostra selecionada para o painel principal e dispara uma nova inferência no modelo `best.pt`.
  - **Ver (Ficha Técnica):** Abre modal com UUID copiável, data de inserção, área mapeada em hectares e lista de detecções vinculadas.
  - **Renomear (`PATCH`):** Altera o nome do arquivo na tabela `images` e sincroniza automaticamente os registros vinculados na tabela `analyses`.
  - **Excluir (`DELETE`):** Remove a amostra e suas anomalias do banco de dados e apaga o arquivo físico correspondente em disco.

### 3. 📋 Histórico de Capturas & Análises (`/historico`)
- **Listagem Paginada de Alta Performance:** Consulta paginada (`page`, `page_size`) com retorno ordenado da análise mais recente para a mais antiga e cabeçalhos `X-Total-Count`, `X-Page` e `X-Page-Size`.
- **Modo Leitura Instantâneo (`Ver Detecção`):** Ao clicar em *Ver Detecção*, o usuário é levado ao painel principal (`/?analise_id=...`) em **Modo Leitura**, recarregando instantaneamente as *bounding boxes* salvas no histórico sem reexecutar a inferência da IA.
- **Trava Anti-Duplicação:** Proteção no backend que ignora disparos duplicados para a mesma imagem em intervalos menores que 5 segundos.
- **Busca e Filtro por Formato:** Pesquisa por nome da foto, talhão, cidade ou data, além de filtro dedicado por extensão (`JPG` ou `PNG`).

### 4. 🗺️ Mapa de Campo Geoespacial (`/mapa`)
- **Visualização Multimapa (Leaflet / React-Leaflet):**
  - *Satélite Google (Híbrido)*
  - *Satélite Esri (World Imagery UAV)*
  - *Ruas e Rodovias (OpenStreetMap)*
- **Pinos Inteligentes por Densidade:** Marcadores circulares exibindo o número de espigas detectadas e coloridos conforme a faixa agronômica:
  - 🟢 **Verde (`> 50 espigas`):** Alta Densidade.
  - 🟡 **Âmbar (`20 a 50 espigas`):** Densidade Média.
  - 🔴 **Vermelho (`< 20 espigas`):** Baixa Densidade / Alerta de Falha.
- **Filtros Geoespaciais e Temporais Flutuantes:**
  - Filtro por período de coleta (*Histórico Completo*, *Últimos 7 dias*, *Últimos 30 dias* ou *Período Específico De/Até*).
  - Filtro por faixa de densidade (Alta, Média, Baixa) e busca textual por nome do talhão.
  - **Filtro Anti-Sobreposição (*"Apenas última inspeção por local"*):** Agrupa pontos na mesma coordenada geográfica e exibe exclusivamente a análise mais recente.

### 5. 🔐 Autenticação e Controle de Acesso (`/login` e `/register`)
- **Fluxo Completo Supabase Auth:** Login com e-mail e senha, cadastro de novos operadores/pesquisadores UAV, persistência segura de sessão em Cookies/LocalStorage e proteção de rotas via Middleware SSR.
- **Modo Avaliação / Demonstração:** Botão de acesso rápido na tela de login que autentica via sessão anônima/contingência para testes imediatos da plataforma.

---

## 🏗️ Arquitetura do Sistema e Regras Agronômicas

```mermaid
flowchart LR
    subgraph Frontend["Frontend (Next.js 16 + React 19)"]
        UI["Painel de Detecção (/)"]
        AM["Banco de Amostras (/amostras)"]
        HI["Histórico (/historico)"]
        MP["Mapa Geoespacial (/mapa)"]
        AU["AuthContext + Middleware SSR"]
    end

    subgraph Backend["Backend API (FastAPI + SOA)"]
        RT["Rotas REST + Validação JWT"]
        AIS["AIService (Singleton Cache)"]
        STS["StorageService (Async Chunks)"]
        HIS["HistoryService & ImageService"]
    end

    subgraph CV["Motor de IA (CV Engine)"]
        YOLO["Ultralytics YOLOv8x (best.pt)"]
        DIAG["Diagnóstico Agronômico & GPS"]
    end

    subgraph Data["Persistência Híbrida"]
        PG[("Supabase PostgreSQL\n(Pooler IPv4)")]
        JS[("Fallback Local\n(analyses_history.json)")]
        FS[("Arquivos Estáticos\n(temp_images/)")]
    end

    Frontend <-->|"HTTP / JSON + Bearer JWT"| RT
    RT --> AIS & STS & HIS
    STS --> FS
    AIS --> YOLO --> DIAG
    HIS --> PG
    HIS -.->|"Contingência"| JS
```

### Fórmulas e Regras de Negócio Agronômicas (`backend/ai_engine.py`)
- **Cálculo de Densidade Estimada:**
  $$\text{Densidade Estimada} = \frac{\text{Total de Espigas}}{\text{Área de Enquadramento (m}^2\text{)}}$$
- **Classificação de Densidade (Enquadramento Padrão de $1,0\text{ m}^2$):**
  - **Baixa:** $< 300,0\text{ espigas/m}^2$
  - **Média:** $300,0 \text{ a } 499,9\text{ espigas/m}^2$
  - **Alta densidade:** $\ge 500,0\text{ espigas/m}^2$
- **Projeção de Potencial Produtivo da Lavoura:**
  Considerando os componentes médios de rendimento de **$35\text{ grãos por espiga}$** e Peso de Mil Grãos (**$\text{PMG} = 40,0\text{ g}$**):
  $$\text{Produtividade (kg/ha)} = \text{Densidade} \times 35 \times \frac{40,0}{1000} \times 10$$
  $$\text{Produtividade (sacas/ha)} = \frac{\text{Produtividade (kg/ha)}}{60,0}$$

---

## 📂 Estrutura de Diretórios

```text
sugarvision/
├── backend/                        # API RESTful em FastAPI (Arquitetura Orientada a Serviços)
│   ├── app/
│   │   ├── api/router.py           # Roteador de endpoints da aplicação
│   │   ├── core/
│   │   │   ├── config.py           # Configurações globais, limites (20 MB) e caminhos
│   │   │   ├── dependencies.py     # Injeção de dependência Singleton (@lru_cache)
│   │   │   └── security.py         # Proteção JWT (HS256) e chave AUTH_ENABLED
│   │   └── services/
│   │       ├── ai_service.py       # Cache em memória do modelo YOLOv8x e inferência async
│   │       ├── anomaly_service.py  # Consultas assíncronas de anomalias e saúde do banco
│   │       ├── history_service.py  # Serviço de paginação e persistência do histórico
│   │       ├── image_service.py    # Gerenciamento assíncrono do banco de amostras
│   │       └── storage_service.py  # Upload via streaming em chunks e sanitização
│   ├── scripts/
│   │   ├── start_tunnel.ps1        # Automação PowerShell para Cloudflare Tunnel + Uvicorn
│   │   ├── validate_tunnel.py      # Validação de ponta a ponta do túnel HTTPS e CORS
│   │   └── validate_wheat_sprint5.py # Benchmark automatizado com geração de relatórios
│   ├── ai_engine.py                # Motor de inferência YOLO e cálculos agronômicos
│   ├── best.pt                     # Pesos treinados do modelo YOLOv8x (~136 MB)
│   ├── database.py                 # Pool PostgreSQL (psycopg2), Supabase API e fallback JSON
│   ├── main.py                     # Aplicação principal FastAPI, CORS e rotas
│   ├── requirements.txt            # Lista de pacotes Python do backend
│   ├── test_backend.py             # Bateria com 44 testes automatizados do backend
│   └── .env.example                # Modelo de variáveis de ambiente do servidor
│
├── cv_engine/                      # Motor Standalone de Visão Computacional e Benchmark
│   ├── samples/
│   │   ├── wheat_test_set/         # 20 imagens e 20 labels YOLO curados do GWHD 2021
│   │   ├── curation_manifest.json  # Metadados fotométricos e de domínio de cada amostra
│   │   ├── data.yaml               # Configuração oficial Ultralytics YOLO (nc: 1, wheat)
│   │   └── README.md               # Documentação dos 4 clusters fenológicos/iluminação
│   ├── analyzer.py                 # Classe SugarVisionAnalyzer (CLI, polígonos e GPS)
│   ├── curate_wheat_test_set.py    # Script de curadoria do conjunto oficial de testes
│   ├── verify_wheat_test_set.py    # Testes de integridade e paridade 1:1 do dataset
│   ├── test_analyzer.py            # Testes unitários do motor de visão computacional
│   └── requirements.txt            # Dependências isoladas do motor CV
│
├── frontend/                       # Aplicação Web em Next.js 16 + React 19 + Tailwind CSS 4
│   ├── app/
│   │   ├── amostras/page.tsx       # Interface do Banco de Amostras
│   │   ├── components/Sidebar.tsx  # Navegação lateral retrátil e perfil do operador
│   │   ├── context/AuthContext.tsx # Gerenciamento de estado de autenticação global
│   │   ├── dashboard/page.tsx      # Rota de redirecionamento para o painel principal
│   │   ├── historico/page.tsx      # Interface do Histórico de Capturas
│   │   ├── login/page.tsx          # Tela de login e modo demonstração
│   │   ├── mapa/
│   │   │   ├── FieldMap.tsx        # Mapa interativo Leaflet com camadas e filtros
│   │   │   └── page.tsx            # Página de monitoramento geoespacial
│   │   ├── register/page.tsx       # Tela de registro de novos usuários
│   │   ├── utils/geoMath.ts        # Cálculos auxiliares de área e formatação numérica
│   │   ├── ImageDetectionViewer.tsx# Visualizador de imagens com caixas delimitadoras
│   │   ├── layout.tsx              # Layout global da aplicação
│   │   └── page.tsx                # Painel Principal de Inspeção Visual
│   ├── lib/supabase/               # Configuração SSR/Browser do Supabase e helper authFetch
│   ├── middleware.ts               # Middleware de proteção e refresh de sessão
│   ├── test_routes.mjs             # Script de validação de redirecionamento de rotas
│   └── package.json                # Scripts e dependências do frontend
│
└── reports/                        # Documentação Científica e Benchmarks
    ├── sprint5_wheat_validation/   # Relatórios Markdown/JSON e 20 fotos anotadas pelo modelo
    └── sprint8_sahi_tiling/        # Estudo de fatiamento SAHI para imagens de alta altitude
```

---

## 🚀 Como Executar Localmente

### 1. Pré-requisitos
Certifique-se de ter instalado em sua máquina:
- **Python 3.10 ou superior**
- **Node.js 20 ou superior** (com `npm`)
- **Git** e **Git LFS** (indispensável para baixar o modelo binário `backend/best.pt`)

### 2. Clonar o Repositório
```bash
git clone https://github.com/sugarvision/sugarvision.git
cd sugarvision
git lfs pull
```

### 3. Configurar e Iniciar o Backend (FastAPI)

1. Entre na pasta `backend` e crie um ambiente virtual:
   ```bash
   cd backend
   python -m venv venv
   ```

2. Ative o ambiente virtual:
   - **No Linux / macOS:**
     ```bash
     source venv/bin/activate
     ```
   - **No Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```

3. Instale as dependências Python:
   ```bash
   pip install -r requirements.txt
   ```

4. Crie o arquivo `.env` a partir do template `.env.example`:
   ```bash
   cp .env.example .env
   ```

5. Configure as variáveis no arquivo `backend/.env`:
   ```env
   SUPABASE_URL=https://hbropsjrbebbuiwcjrcu.supabase.co
   SUPABASE_KEY=sua_supabase_anon_ou_service_key_aqui
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.hbropsjrbebbuiwcjrcu.supabase.co:5432/postgres
   DATABASE_PASSWORD=sua_senha_aqui
   SUPABASE_JWT_SECRET=seu_jwt_secret_aqui

   # Defina como False para rodar localmente sem exigir token JWT (Modo Contingência/Demo)
   AUTH_ENABLED=False

   # URL base pública para servir as imagens processadas
   BASE_URL=http://127.0.0.1:8000
   ```

6. Inicie o servidor FastAPI:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - O backend estará ativo em: `[http://127.0.0.1:8000](http://127.0.0.1:8000)`
   - Documentação interativa Swagger UI: `[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)`

### 4. Configurar e Iniciar o Frontend (Next.js)

1. Abra um **novo terminal** na pasta `frontend`:
   ```bash
   cd frontend
   ```

2. Instale as dependências Node.js:
   ```bash
   npm install
   ```

3. Crie um arquivo `.env.local` na raiz da pasta `frontend/`:
   ```env
   NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
   NEXT_PUBLIC_SUPABASE_URL=https://hbropsjrbebbuiwcjrcu.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_supabase_anon_key_aqui
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Acesse a aplicação web no navegador:
   ```text
   http://localhost:3000
   ```
   > **Dica de Acesso Rápido:** Na tela de login (`http://localhost:3000/login`), você pode clicar em **"Acesso Rápido — Modo Avaliação / Demo"** para entrar imediatamente no painel mesmo sem configurar credenciais externas.

---

## 🌐 Referência da API (Endpoints)

| Método | Endpoint | Proteção JWT | Descrição |
| :---: | :--- | :---: | :--- |
| `GET` | `/` | Não | Verifica se o servidor está online. |
| `GET` | `/health` | Não | Retorna o status da API e o diagnóstico de conexão com o Supabase/PostgreSQL. |
| `POST` | `/upload` | Sim* | Faz upload de uma imagem (`file`), executa a detecção YOLOv8x e salva nas amostras e no histórico. |
| `GET/POST` | `/api/analyze-sample` | Sim* | Executa inferência YOLO em uma imagem de amostra já existente (`?filename=...`). |
| `GET` | `/api/images` | Sim* | Lista todas as amostras da tabela `images` com contagem e área de anomalias. |
| `GET` | `/api/amostras` | Sim* | Alias para `/api/images`. |
| `PATCH` | `/api/images/{image_id}` | Sim* | Renomeia uma amostra (`{"filename": "novo_nome.jpg"}`) na tabela `images` e no histórico. |
| `DELETE` | `/api/images/{image_id}` | Sim* | Exclui a amostra do banco de dados e remove o arquivo físico do diretório `temp_images/`. |
| `GET` | `/api/historico` | Sim* | Lista o histórico paginado (`?page=1&page_size=50`) ordenado pelas análises mais recentes. |
| `GET` | `/api/historico/{analysis_id}` | Sim* | Retorna os detalhes e as *bounding boxes* salvas de uma análise específica. |
| `POST` | `/api/historico` | Sim* | Cria manualmente um registro de análise no histórico. |
| `DELETE` | `/api/historico/{analysis_id}` | Sim* | Remove uma análise do histórico no Supabase e no arquivo JSON local. |
| `GET` | `/api/anomalies` | Sim* | Retorna as falhas e polígonos cadastrados na tabela `anomalies`. |

*\*Quando `AUTH_ENABLED=False` no arquivo `backend/.env`, a validação do cabeçalho `Authorization: Bearer <token>` é desativada automaticamente.*

---

## 🧪 Suíte de Testes e Validação Científica

### 1. Executar os 44 Testes do Backend (`backend/test_backend.py`)
Valida endpoints, upload de PNG/JPEG, streaming de arquivos grandes, bloqueio de arquivos > 20 MB (HTTP 413), rejeição de extensões não suportadas (HTTP 400), injeção de dependência, cache *Singleton* do YOLO, fórmulas de densidade, paginação (< 500 ms) e autenticação JWT:
```bash
cd backend
python test_backend.py
```

### 2. Executar os Testes do Motor de Visão Computacional (`cv_engine/test_analyzer.py`)
Valida o carregamento do `best.pt`, conversão de pixels para coordenadas GPS, categorização agronômica de densidade e exportação de imagens anotadas e JSON:
```bash
python -m unittest cv_engine/test_analyzer.py
```

### 3. Validar o Conjunto Oficial de Testes do GWHD (`cv_engine/verify_wheat_test_set.py`)
Verifica a integridade das 20 imagens e 20 arquivos de anotação (1.560 espigas) do benchmark oficial:
```bash
python -m unittest cv_engine/verify_wheat_test_set.py
```

### 4. Executar Inferência via Linha de Comando (CLI)
Para analisar uma imagem diretamente pelo terminal sem subir a interface web:
```bash
python cv_engine/analyzer.py \
  --image cv_engine/trigo_teste.png \
  --model backend/best.pt \
  --conf 0.45 \
  --iou 0.50 \
  --output-json cv_engine/resultado_analise.json \
  --output-img cv_engine/resultado_anotado.jpg
```

---

## ☁️ Exposição via Cloudflare Tunnel (Opcional)

Caso o frontend esteja publicado na **Vercel** e você deseje conectá-lo ao backend rodando na sua máquina local via HTTPS público:

1. Execute o script PowerShell que valida a memória RAM livre, inicia o `cloudflared`, captura a URL `https://*.trycloudflare.com`, define `BASE_URL` automaticamente e sobe o Uvicorn:
   ```powershell
   .\backend\scripts\start_tunnel.ps1
   ```
2. Valide o funcionamento do túnel gerado (testa `/health`, CORS Preflight e 3 uploads reais consecutivos):
   ```bash
   python backend/scripts/validate_tunnel.py https://seu-subdominio.trycloudflare.com
   ```

---

## 📚 Referências Científicas

1. **Global Wheat Head Dataset 2021 (GWHD):** David, E., Madec, S., Sadeghi-Tehran, P., et al. (2021). *Global Wheat Head Dataset 2021: more diversity to improve the average domain generalization*. Plant Phenomics, 2021. (Licença CC BY 4.0).
2. **SAHI (Slicing Aided Hyper Inference):** Akyon, F. C., Altinuc, S. O., & Temizel, A. (2022). *Slicing Aided Hyper Inference and Fine-Tuning for Small Object Detection*. In 2022 IEEE International Conference on Image Processing (ICIP), pp. 966–970.
3. **Ultralytics YOLOv8:** Jocher, G., Chaurasia, A., & Qiu, J. (2023). *Ultralytics YOLOv8 Documentation*. Disponível em: [https://docs.ultralytics.com](https://docs.ultralytics.com).

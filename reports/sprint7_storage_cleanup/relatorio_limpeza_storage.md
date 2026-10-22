# Relatório de Entrega da Sprint 7: Rotina de Limpeza de Arquivos Temporários de Imagem

- **Responsável:** 🗄️ Membro 2 (DB / Guilherme)
- **Componente:** Backend / Microserviço de Armazenamento (`StorageService`)
- **Status:** Concluído (100%)
- **Data de Conclusão:** 22/10/2026

---

## 1. Contexto e Objetivo

Durante as inferências na API do SugarVision, as imagens enviadas por operadores agrícolas e drones UAV são armazenadas na pasta local `temp_images/` para processamento pelo motor YOLO e disponibilização via rota estática. Sem uma rotina de higienização automatizada, o consumo de armazenamento em disco no servidor se tornaria cumulativo e insustentável.

O objetivo da Sprint 7 foi implementar a rotina de varredura e expiração de imagens com mais de 7 dias, garantindo descarte não-bloqueante e proteção a arquivos permanentes de seed/contingência.

---

## 2. Implementações Realizadas

### 2.1. Expansão do `StorageService` (`backend/app/services/storage_service.py`)
- **Lista de Proteção (`PROTECTED_TEMP_FILES`):** Garante a preservação de arquivos essenciais ao funcionamento dos mocks e testes (`.gitkeep`, `cana_teste.jpg`, `amostra_erva_daninha.jpg`, `trigo_teste.png`).
- **Método `cleanup_temp_images(days=7)`:**
  - Varre o diretório configurado (`self.target_dir.glob("*")`).
  - Avalia o timestamp de modificação (`stat().st_mtime`) frente à janela de retenção (`time.time() - (days * 86400)`).
  - Invoca o método assíncrono não-bloqueante de exclusão (`delete_image_async`).
  - Retorna telemetria consolidada (`scanned`, `deleted`, `skipped_recent`, `skipped_protected`, `errors`, `deleted_files`).
- **Método utilitário `cleanup_temp_images_sync`:** Permite invocação síncrona segura em scripts agendados e CLIs via `asyncio.run`.

### 2.2. Integração no Ciclo de Vida da API (`backend/main.py`)
- **Gatilho de Startup (`@app.on_event("startup")`):** A rotina é acionada automaticamente sempre que o servidor FastAPI inicia.
- **Endpoint Administrativo (`POST /api/storage/cleanup`):** Rota autenticada via token JWT que permite a operadores ou ferramentas de monitoramento disparar a limpeza sob demanda com parâmetro customizado de dias de retenção.
- **Módulo de Compatibilidade (`backend/app/main.py`):** Criado para prevenir erros de importação caso outros membros do grupo utilizem o caminho `app.main:app`.

### 2.3. Script Standalone (`backend/scripts/cleanup_temp_images.py`)
- Script executável para agendamento em tarefas do Windows (Task Scheduler) ou cron jobs em Linux.
- Suporta os parâmetros `--days` e `--dry-run` para simulação segura sem alteração de disco.

### 2.4. Testes Automatizados (`backend/test_backend.py`)
- `test_45_storage_cleanup_deletes_expired_files_and_preserves_recent`: Valida criação e exclusão física de arquivos com mais de 7 dias e preservação de arquivos recentes.
- `test_46_storage_cleanup_preserves_protected_files`: Valida que arquivos permanentes de contingência não são removidos mesmo após dezenas de dias.
- `test_47_storage_cleanup_endpoint`: Valida a resposta `HTTP 200 OK` e integridade do payload do endpoint administrativo.

---

## 3. Prevenção de Conflitos com os Demais Integrantes

| Integrante / Frente | Potencial Risco | Mitigação Implementada |
| :--- | :--- | :--- |
| **Membro 1 (Frontend / Dashboard)** | Histórico perder imagens estáticas de mock | Imagens de contingência (`cana_teste.jpg`, etc.) protegidas por whitelist imutável. |
| **Membro 3 & 4 (IA / YOLO / SAHI)** | Interferência na pasta durante uploads pesados | Limpeza baseada em `mtime` > 7 dias; uploads correntes permanecem intocados. |
| **Membro 2 (DB / Persistência)** | Quebra de assinaturas do serviço de storage | Mantida compatibilidade total retroativa em `save_image_async` e `delete_image_async`. |
| **Equipe Geral (Execução local)** | Divergência de caminhos `main.py` vs `app/main.py` | Criado alias `backend/app/main.py` apontando para o core. |

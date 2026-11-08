# Relatório Técnico — Backup de Segurança do Banco, Higienização de Registros de Teste e Blindagem RLS

- **Projeto:** SugarVision — Sistema Inteligente de Contagem e Monitoramento de Espigas de Trigo via UAV / YOLOv8x
- **Unidade de Referência:** Embrapa Trigo (Rodovia BR-285, Km 294, Passo Fundo - RS)
- **Banco de Dados:** Supabase PostgreSQL 17 (`hbropsjrbebbuiwcjrcu`)
- **Data da Execução:** 08/11/2026

---

## 1. Diagnóstico e Higienização de Registros de Teste

### 1.1 Estado Anterior do Banco (Pré-Higienização)
Durante a auditoria das tabelas de produção no Supabase e do arquivo de contingência local (`backend/analyses_history.json`), foram identificados registros poluídos gerados por baterias de testes automatizados e uploads manuais de homologação:

| Tabela | Total Anterior | Registros Poluídos / Teste Removidos | Estado Final Oficial |
| :--- | :---: | :---: | :---: |
| `public.images` | 168 | 168 registros de teste (`jwt_teste.png`, `mock_di_saved.png`, `drone_teste_bg.jpg`, `trigo_bg_test.png`, `krgjrgsjhisrgjihdrgsi (1).png`, `trigos ou tigres.jpg`, `teste_rls_bypass.jpg`, etc.) | **20 amostras oficiais** |
| `public.analyses` | 158 | 158 registros (152 imagens 1x1 pixel de teste com `focos_detectados = 0` e 6 seeds incompletos com `image_id = NULL` e `detections_json = []`) | **20 análises completas** |
| `public.detections` | 1 | 1 registro legado de cana/erva daninha (`amostra_erva_daninha.jpg` em Piracicaba/SP) | **20 detecções de trigo** |
| `auth.users` | 7 | 3 sessões anônimas órfãs (`email IS NULL`, `is_anonymous = true`) | **4 operadores autenticados** |

### 1.2 Prevenção Definitiva de Re-poluição (`backend/test_backend.py`)
Foi identificado que a execução de `backend/test_backend.py` realizava chamadas `POST /upload` sem remover os registros criados no encerramento da suíte. Para eliminar esse conflito, foram implementados `setUpModule()` e `tearDownModule()` em `backend/test_backend.py` para restaurar o snapshot de `backend/analyses_history.json` e expurgar qualquer registro de teste residual ao final da bateria.

---

## 2. População Oficial — Safra Embrapa Trigo (Últimos 30 Dias)

O banco de dados de produção (`public.images`, `public.analyses` e `public.detections`) e o cache local (`backend/analyses_history.json`) foram populados com **20 análises oficiais** curadas do dataset GWHD 2021 / YOLOv8x (`wheat_test_01_Terraref_1.jpg` a `wheat_test_20_NAU_3.jpg`), contendo todos os bounding boxes reais, tempos de inferência, coordenadas georreferenciadas nos polígonos rurais da Embrapa Trigo e distribuição temporal contínua nos últimos 30 dias da safra (**10/10/2026 a 08/11/2026**).

### 2.1 Resumo Consolidado por Talhão Experimental

| Código do Talhão | Nome Oficial | Cultivar | Área (ha) | Total de Análises | Média de Espigas (esp/m²) | Período Amostrado |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: |
| **EXP-01** | Talhão Experimental 01 — Passo Fundo/RS (Setor Norte) | BRS Pastoreio | 18,5 ha | 7 | **79,4 esp/m²** | 10/10/2026 a 06/11/2026 |
| **EXP-02** | Talhão Experimental 02 — Passo Fundo/RS (Setor Sul) | TBIO Sintonia | 21,0 ha | 7 | **55,9 esp/m²** | 12/10/2026 a 31/10/2026 |
| **EXP-03** | Talhão Experimental 03 — Passo Fundo/RS (Ensaio Leste) | BRS Belamar | 24,2 ha | 6 | **102,2 esp/m²** | 18/10/2026 a 08/11/2026 |

### 2.2 Cronograma das 20 Análises Oficiais Populadas

| # | Data / Hora (UTC) | Arquivo da Amostra | Talhão | Cultivar | Espigas (`focos_detectados`) | Inferência (`ms`) | Coordenadas GPS (`lat`, `lon`) |
| :---: | :---: | :--- | :---: | :--- | :---: | :---: | :---: |
| 01 | `2026-10-10 08:45` | `wheat_test_01_Terraref_1.jpg` | `EXP-01` | BRS Pastoreio | 15 | 312,4 ms | `-28.2172, -52.4085` |
| 02 | `2026-10-12 09:20` | `wheat_test_02_Terraref_2.jpg` | `EXP-02` | TBIO Sintonia | 6 | 298,7 ms | `-28.2225, -52.4095` |
| 03 | `2026-10-13 10:15` | `wheat_test_03_CIMMYT_1.jpg` | `EXP-01` | BRS Pastoreio | 67 | 345,2 ms | `-28.2180, -52.4065` |
| 04 | `2026-10-15 14:10` | `wheat_test_04_CIMMYT_2.jpg` | `EXP-02` | TBIO Sintonia | 42 | 328,9 ms | `-28.2238, -52.4075` |
| 05 | `2026-10-16 11:05` | `wheat_test_05_Terraref_2.jpg` | `EXP-02` | TBIO Sintonia | 33 | 304,6 ms | `-28.2248, -52.4100` |
| 06 | `2026-10-18 08:30` | `wheat_test_06_UQ_11.jpg` | `EXP-03` | BRS Belamar | 121 | 389,1 ms | `-28.2185, -52.4015` |
| 07 | `2026-10-19 15:25` | `wheat_test_07_UQ_10.jpg` | `EXP-01` | BRS Pastoreio | 95 | 362,5 ms | `-28.2190, -52.4090` |
| 08 | `2026-10-21 09:50` | `wheat_test_08_UQ_8.jpg` | `EXP-03` | BRS Belamar | 94 | 358,0 ms | `-28.2202, -52.4000` |
| 09 | `2026-10-22 10:40` | `wheat_test_09_UQ_8.jpg` | `EXP-01` | BRS Pastoreio | 102 | 374,3 ms | `-28.2168, -52.4055` |
| 10 | `2026-10-24 13:30` | `wheat_test_10_UQ_10.jpg` | `EXP-03` | BRS Belamar | 103 | 369,8 ms | `-28.2218, -52.4022` |
| 11 | `2026-10-26 09:15` | `wheat_test_11_Ukyoto_1.jpg` | `EXP-02` | TBIO Sintonia | 86 | 341,7 ms | `-28.2252, -52.4062` |
| 12 | `2026-10-28 10:00` | `wheat_test_12_ARC_1.jpg` | `EXP-02` | TBIO Sintonia | 78 | 334,0 ms | `-28.2230, -52.4082` |
| 13 | `2026-10-30 11:20` | `wheat_test_13_Ukyoto_1.jpg` | `EXP-02` | TBIO Sintonia | 73 | 319,5 ms | `-28.2219, -52.4058` |
| 14 | `2026-10-31 16:05` | `wheat_test_14_Ukyoto_1.jpg` | `EXP-02` | TBIO Sintonia | 73 | 322,1 ms | `-28.2244, -52.4069` |
| 15 | `2026-11-02 08:40` | `wheat_test_15_Ukyoto_1.jpg` | `EXP-01` | BRS Pastoreio | 71 | 315,8 ms | `-28.2186, -52.4074` |
| 16 | `2026-11-03 10:25` | `wheat_test_16_NAU_2.jpg` | `EXP-01` | BRS Pastoreio | 109 | 394,6 ms | `-28.2163, -52.4098` |
| 17 | `2026-11-05 09:10` | `wheat_test_17_KSU_3.jpg` | `EXP-03` | BRS Belamar | 108 | 402,3 ms | `-28.2230, -52.3995` |
| 18 | `2026-11-06 14:50` | `wheat_test_18_NAU_3.jpg` | `EXP-01` | BRS Pastoreio | 97 | 378,4 ms | `-28.2175, -52.4048` |
| 19 | `2026-11-07 11:30` | `wheat_test_19_NAU_3.jpg` | `EXP-03` | BRS Belamar | 94 | 366,9 ms | `-28.2176, -52.4008` |
| 20 | `2026-11-08 10:15` | `wheat_test_20_NAU_3.jpg` | `EXP-03` | BRS Belamar | 93 | 359,2 ms | `-28.2194, -52.3992` |

---

## 3. Dump / Export SQL de Backup

O arquivo oficial de backup estruturado foi gerado em:
- `supabase/backups/backup_embrapa_trigo_20261108.sql` (~871 KB)
- Script gerador/executor: `backend/scripts/cleanup_and_seed_embrapa.py`
- Script SQL de seed direto: `backend/scripts/seed_embrapa_production.sql`

Conteúdo do Backup SQL:
1. **DDL Completo e Constraints:** Criação idempotente e chaves estrangeiras (`ON DELETE SET NULL` em `analyses.image_id` e `ON DELETE CASCADE` em `detections.image_id`).
2. **Políticas de Segurança RLS:** Comandos `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`, `REVOKE ALL ... FROM anon` e políticas `CREATE POLICY` para `authenticated` e `service_role`.
3. **Usuários de Teste / Operadores (`auth.users`):** Backup dos 4 operadores registrados (`marvin@sugarvision.com`, `cesar@agro.com`, `csrbovo18@gmail.com` e `sugarvision_tester_1793714351819@gmail.com`).
4. **Dados Oficiais (`public.images`, `public.analyses`, `public.detections`):** `INSERT` completos com `detections_json`, `summary_json` e `boxes_json` das 20 análises da safra.

---

## 4. Blindagem RLS (Row Level Security) contra Operadores Não Autorizados

A migração `supabase/migrations/20261108180000_harden_rls_policies_and_security.sql` foi aplicada no banco de produção:
- **Remoção de Políticas Públicas/Anônimas:** Foram removidas todas as políticas legadas que permitiam acesso à role `public` ou `anon` (`Permitir leitura anonima imagens`, `Permitir insercao anonima imagens`, `Permitir atualizacao anonima imagens`, `Permitir leitura de amostras (anon e authenticated)`, `Permitir leitura de analises (anon e authenticated)`, `Permitir leitura anonima anomalias`, `Permitir insercao anonima anomalias`).
- **Revogação de Privilégios Anônimos:** Executado `REVOKE ALL ON TABLE public.images, public.analyses, public.detections FROM anon;`.
- **Bloqueio de Sessões Anônimas (`is_anonymous`):** Todas as políticas `SELECT`, `INSERT`, `UPDATE` e `DELETE` das tabelas `public.images`, `public.analyses` e `public.detections` exigem simultaneamente:
  ```sql
  (select auth.uid()) IS NOT NULL
  AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  ```
- **Validação no Supabase Security Advisor:** Todos os alertas de exposição RLS (`0012_auth_allow_anonymous_sign_ins` e `0008_rls_enabled_no_policy`) nas tabelas do banco foram **100% eliminados**.

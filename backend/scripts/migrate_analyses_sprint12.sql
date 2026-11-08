-- ============================================================================
-- Script de Migração (Sprint 12): Metadados Geoespaciais e Agregações por Talhão
-- Garante na tabela public.analyses as colunas:
--   latitude (float8), longitude (float8), cultivar (text), talhao_codigo (text),
--   inference_time_ms (float8) e densidade_estimada (float8).
-- ============================================================================

ALTER TABLE public.analyses
    ADD COLUMN IF NOT EXISTS latitude float8,
    ADD COLUMN IF NOT EXISTS longitude float8,
    ADD COLUMN IF NOT EXISTS cultivar text,
    ADD COLUMN IF NOT EXISTS talhao_codigo text,
    ADD COLUMN IF NOT EXISTS inference_time_ms float8,
    ADD COLUMN IF NOT EXISTS densidade_estimada float8;

CREATE INDEX IF NOT EXISTS idx_analyses_talhao_codigo ON public.analyses (talhao_codigo);
CREATE INDEX IF NOT EXISTS idx_analyses_cultivar ON public.analyses (cultivar);

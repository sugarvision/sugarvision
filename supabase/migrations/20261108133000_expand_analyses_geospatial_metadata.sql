-- ============================================================================
-- Migração: Persistência Completa de Metadados Geoespaciais e Agregações
-- Tabela: public.analyses
-- Colunas adicionadas/garantidas:
--   - latitude (float8 / double precision)
--   - longitude (float8 / double precision)
--   - cultivar (text)
--   - talhao_codigo (text)
--   - inference_time_ms (float8 / double precision)
--   - densidade_estimada (float8 / double precision)
-- ============================================================================

ALTER TABLE public.analyses
    ADD COLUMN IF NOT EXISTS latitude float8,
    ADD COLUMN IF NOT EXISTS longitude float8,
    ADD COLUMN IF NOT EXISTS cultivar text,
    ADD COLUMN IF NOT EXISTS talhao_codigo text,
    ADD COLUMN IF NOT EXISTS inference_time_ms float8,
    ADD COLUMN IF NOT EXISTS densidade_estimada float8;

-- Índices para acelerar agregações consolidadas por talhão e cultivar
CREATE INDEX IF NOT EXISTS idx_analyses_talhao_codigo ON public.analyses (talhao_codigo);
CREATE INDEX IF NOT EXISTS idx_analyses_cultivar ON public.analyses (cultivar);

-- Backfill seguro de registros legados a partir de summary_json, variedade e talhao_id
UPDATE public.analyses
SET
    latitude = COALESCE(
        latitude,
        CASE
            WHEN summary_json IS NOT NULL AND summary_json LIKE '{%' AND (summary_json::jsonb ->> 'latitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (summary_json::jsonb ->> 'latitude')::float8
            ELSE NULL
        END
    ),
    longitude = COALESCE(
        longitude,
        CASE
            WHEN summary_json IS NOT NULL AND summary_json LIKE '{%' AND (summary_json::jsonb ->> 'longitude') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (summary_json::jsonb ->> 'longitude')::float8
            ELSE NULL
        END
    ),
    inference_time_ms = COALESCE(
        inference_time_ms,
        CASE
            WHEN summary_json IS NOT NULL AND summary_json LIKE '{%' AND (summary_json::jsonb ->> 'inference_time_ms') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (summary_json::jsonb ->> 'inference_time_ms')::float8
            ELSE NULL
        END
    ),
    densidade_estimada = COALESCE(
        densidade_estimada,
        CASE
            WHEN summary_json IS NOT NULL AND summary_json LIKE '{%' AND (summary_json::jsonb ->> 'densidade_estimada') ~ '^-?[0-9]+(\.[0-9]+)?$'
            THEN (summary_json::jsonb ->> 'densidade_estimada')::float8
            WHEN area_amostra_m2 IS NOT NULL AND area_amostra_m2 > 0
            THEN ROUND((COALESCE(focos_detectados, 0)::numeric / area_amostra_m2)::numeric, 2)::float8
            ELSE COALESCE(focos_detectados, 0)::float8
        END
    ),
    talhao_codigo = COALESCE(
        NULLIF(TRIM(talhao_codigo), ''),
        CASE
            WHEN UPPER(COALESCE(talhao_id, '')) LIKE 'EXP-02%' THEN 'EXP-02'
            WHEN UPPER(COALESCE(talhao_id, '')) LIKE 'EXP-03%' THEN 'EXP-03'
            ELSE 'EXP-01'
        END
    ),
    cultivar = COALESCE(
        NULLIF(TRIM(cultivar), ''),
        CASE
            WHEN variedade IS NOT NULL AND variedade NOT IN ('Trigo', 'CTC-9001 (Plena Safra)', 'RB867515 (Cana Soca)', 'IACSP95-5000')
            THEN variedade
            ELSE 'BRS Pastoreio'
        END
    );

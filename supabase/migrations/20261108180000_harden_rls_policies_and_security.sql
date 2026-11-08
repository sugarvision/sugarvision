-- =============================================================================
-- Migration: Harden RLS Policies & Operator Access Control (Sprint 12)
-- Garante que as políticas de segurança RLS (Row Level Security) do Supabase
-- protejam os dados das tabelas images, analyses e detections contra operadores
-- não autorizados (revogando acesso anônimo/público e exigindo JWT autenticado
-- não-anônimo).
-- =============================================================================

BEGIN;

-- 1. Ajustar Foreign Keys para integridade referencial segura na exclusão de imagens
ALTER TABLE public.analyses
    DROP CONSTRAINT IF EXISTS analyses_image_id_fkey,
    ADD CONSTRAINT analyses_image_id_fkey
        FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE SET NULL;

ALTER TABLE public.detections
    DROP CONSTRAINT IF EXISTS detections_image_id_fkey,
    ADD CONSTRAINT detections_image_id_fkey
        FOREIGN KEY (image_id) REFERENCES public.images(id) ON DELETE CASCADE;

-- 2. Habilitar RLS em todas as tabelas sensíveis
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

-- 3. Revogar privilégios da role 'anon' (bloqueia operadores não autenticados)
REVOKE ALL ON TABLE public.images FROM anon;
REVOKE ALL ON TABLE public.analyses FROM anon;
REVOKE ALL ON TABLE public.detections FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.images TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.analyses TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.detections TO authenticated, service_role;

-- 4. Remover todas as políticas antigas permissivas (public / anon) em public.images
DROP POLICY IF EXISTS "Allow public insert on images" ON public.images;
DROP POLICY IF EXISTS "Allow public select on images" ON public.images;
DROP POLICY IF EXISTS "Allow public update on images" ON public.images;
DROP POLICY IF EXISTS "Leitura publica de imagens" ON public.images;
DROP POLICY IF EXISTS "Permitir atualizacao anonima imagens" ON public.images;
DROP POLICY IF EXISTS "Permitir insercao anonima imagens" ON public.images;
DROP POLICY IF EXISTS "Permitir leitura anonima imagens" ON public.images;
DROP POLICY IF EXISTS "Permitir leitura de amostras (anon e authenticated)" ON public.images;
DROP POLICY IF EXISTS "Bypass RLS completo para service_role em images" ON public.images;
DROP POLICY IF EXISTS "Authenticated select images" ON public.images;
DROP POLICY IF EXISTS "Authenticated insert images" ON public.images;
DROP POLICY IF EXISTS "Authenticated update images" ON public.images;
DROP POLICY IF EXISTS "Authenticated delete images" ON public.images;
DROP POLICY IF EXISTS "Service role full access on images" ON public.images;

CREATE POLICY "Authenticated select images"
    ON public.images FOR SELECT
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated insert images"
    ON public.images FOR INSERT
    TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated update images"
    ON public.images FOR UPDATE
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    )
    WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated delete images"
    ON public.images FOR DELETE
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Service role full access on images"
    ON public.images FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 5. Remover todas as políticas antigas permissivas (anon) em public.analyses e criar políticas estritas
DROP POLICY IF EXISTS "Leitura publica de analises" ON public.analyses;
DROP POLICY IF EXISTS "Service role gerencia analises" ON public.analyses;
DROP POLICY IF EXISTS "Permitir leitura de analises (anon e authenticated)" ON public.analyses;
DROP POLICY IF EXISTS "Bypass RLS completo para service_role em analyses" ON public.analyses;
DROP POLICY IF EXISTS "Authenticated select analyses" ON public.analyses;
DROP POLICY IF EXISTS "Authenticated insert analyses" ON public.analyses;
DROP POLICY IF EXISTS "Authenticated update analyses" ON public.analyses;
DROP POLICY IF EXISTS "Authenticated delete analyses" ON public.analyses;
DROP POLICY IF EXISTS "Service role full access on analyses" ON public.analyses;

CREATE POLICY "Authenticated select analyses"
    ON public.analyses FOR SELECT
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated insert analyses"
    ON public.analyses FOR INSERT
    TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated update analyses"
    ON public.analyses FOR UPDATE
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    )
    WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated delete analyses"
    ON public.analyses FOR DELETE
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Service role full access on analyses"
    ON public.analyses FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Remover todas as políticas antigas permissivas (public / anon) em public.detections
DROP POLICY IF EXISTS "Allow public insert on detections" ON public.detections;
DROP POLICY IF EXISTS "Allow public select on detections" ON public.detections;
DROP POLICY IF EXISTS "Leitura publica de anomalias" ON public.detections;
DROP POLICY IF EXISTS "Permitir insercao anonima anomalias" ON public.detections;
DROP POLICY IF EXISTS "Permitir leitura anonima anomalias" ON public.detections;
DROP POLICY IF EXISTS "Permitir leitura de anomalias (anon e authenticated)" ON public.detections;
DROP POLICY IF EXISTS "Bypass RLS completo para service_role em anomalies" ON public.detections;
DROP POLICY IF EXISTS "Authenticated select detections" ON public.detections;
DROP POLICY IF EXISTS "Authenticated insert detections" ON public.detections;
DROP POLICY IF EXISTS "Authenticated update detections" ON public.detections;
DROP POLICY IF EXISTS "Authenticated delete detections" ON public.detections;
DROP POLICY IF EXISTS "Service role full access on detections" ON public.detections;

CREATE POLICY "Authenticated select detections"
    ON public.detections FOR SELECT
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated insert detections"
    ON public.detections FOR INSERT
    TO authenticated
    WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated update detections"
    ON public.detections FOR UPDATE
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    )
    WITH CHECK (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Authenticated delete detections"
    ON public.detections FOR DELETE
    TO authenticated
    USING (
        (select auth.uid()) IS NOT NULL
        AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    );

CREATE POLICY "Service role full access on detections"
    ON public.detections FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 7. Proteger tabela de backup legada cleanup_backup.anomalies_before_cleanup_20261022
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'cleanup_backup'
          AND table_name = 'anomalies_before_cleanup_20261022'
    ) THEN
        ALTER TABLE cleanup_backup.anomalies_before_cleanup_20261022 ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Service role full access on anomalies backup" ON cleanup_backup.anomalies_before_cleanup_20261022;
        CREATE POLICY "Service role full access on anomalies backup"
            ON cleanup_backup.anomalies_before_cleanup_20261022 FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;

COMMIT;

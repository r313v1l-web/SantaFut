-- =======================================================
-- SANTAFUT - SÚMULA AO VIVO & CRONÔMETRO & CONFRONTOS
-- =======================================================

-- 1. Adicionar colunas de times e cronômetro na tabela de jogos
ALTER TABLE public.jogos 
ADD COLUMN IF NOT EXISTS time_casa_id UUID REFERENCES public.times(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS time_fora_id UUID REFERENCES public.times(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS inicio_cronometro TIMESTAMP WITH TIME ZONE;

-- 2. Adicionar coluna de time_id na tabela de eventos da partida
ALTER TABLE public.eventos_partida 
ADD COLUMN IF NOT EXISTS time_id UUID REFERENCES public.times(id) ON DELETE SET NULL;

-- 3. Habilitar RLS nas tabelas 'times' e 'confirmacoes_jogo' (Correção Crítica de Segurança)
ALTER TABLE public.times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confirmacoes_jogo ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de segurança (RLS) para a tabela de 'times'
DROP POLICY IF EXISTS "Qualquer pessoa pode visualizar times" ON public.times;
CREATE POLICY "Qualquer pessoa pode visualizar times" ON public.times
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Apenas admins podem gerenciar times" ON public.times;
CREATE POLICY "Apenas admins podem gerenciar times" ON public.times
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Criar políticas de segurança (RLS) para a tabela de 'confirmacoes_jogo'
DROP POLICY IF EXISTS "Qualquer pessoa pode ver confirmacoes" ON public.confirmacoes_jogo;
CREATE POLICY "Qualquer pessoa pode ver confirmacoes" ON public.confirmacoes_jogo
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Usuarios podem confirmar sua propria presenca" ON public.confirmacoes_jogo;
CREATE POLICY "Usuarios podem confirmar sua propria presenca" ON public.confirmacoes_jogo
    FOR INSERT WITH CHECK (
        auth.uid() = jogador_id
    );

DROP POLICY IF EXISTS "Usuarios podem deletar sua propria presenca" ON public.confirmacoes_jogo;
CREATE POLICY "Usuarios podem deletar sua propria presenca" ON public.confirmacoes_jogo
    FOR DELETE USING (
        auth.uid() = jogador_id
    );


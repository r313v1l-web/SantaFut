-- ==========================================
-- SANTAFUT EXPANSÃO - TIMES & CONFIRMAÇÕES
-- ==========================================

-- 1. Tabela de Times
CREATE TABLE IF NOT EXISTS public.times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT UNIQUE NOT NULL,
    escudo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Modificações em Perfis
-- Adicionar time_id se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS time_id UUID REFERENCES public.times(id) ON DELETE SET NULL;

-- Atualizar o check constraint para o cargo de 'treinador' e 'pendente'
ALTER TABLE public.perfis DROP CONSTRAINT IF EXISTS perfis_role_check;
ALTER TABLE public.perfis ADD CONSTRAINT perfis_role_check CHECK (role IN ('admin', 'analista', 'jogador', 'treinador', 'torcedor', 'pendente'));

-- 3. Atualizar a trigger de criação automática de perfil para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfis (id, nome_completo, apelido, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nome_completo', new.email),
        COALESCE(new.raw_user_meta_data->>'apelido', SPLIT_PART(new.email, '@', 1)),
        'pendente' -- Novos cadastros começam como pendente de atribuição do Admin
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Tabela de Confirmações de Jogo
CREATE TABLE IF NOT EXISTS public.confirmacoes_jogo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jogo_id UUID NOT NULL REFERENCES public.jogos(id) ON DELETE CASCADE,
    jogador_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    confirmado BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(jogo_id, jogador_id)
);

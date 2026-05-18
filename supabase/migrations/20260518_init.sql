-- ==========================================
-- SANTAFUT (FUTPRO) - BANCO DE DADOS INICIAL
-- ==========================================

-- Habilitar a extensão UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE PERFIS (Estende auth.users do Supabase)
CREATE TABLE public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo TEXT NOT NULL,
    apelido TEXT UNIQUE,
    numero_camisa INTEGER,
    posicao TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'jogador' CHECK (role IN ('admin', 'analista', 'jogador', 'torcedor')),
    aceitou_regulamento BOOLEAN DEFAULT FALSE,
    banido BOOLEAN DEFAULT FALSE,
    -- Atributos físicos e técnicos para o FUT Card (0 a 99)
    ritmo INTEGER DEFAULT 60 CHECK (ritmo BETWEEN 0 AND 99),
    finalizacao INTEGER DEFAULT 60 CHECK (finalizacao BETWEEN 0 AND 99),
    passe INTEGER DEFAULT 60 CHECK (passe BETWEEN 0 AND 99),
    conducao INTEGER DEFAULT 60 CHECK (conducao BETWEEN 0 AND 99),
    defesa INTEGER DEFAULT 60 CHECK (defesa BETWEEN 0 AND 99),
    fisico INTEGER DEFAULT 60 CHECK (fisico BETWEEN 0 AND 99),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS em perfis
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 2. TABELA DE JOGOS
CREATE TABLE public.jogos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    adversario TEXT NOT NULL,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    local TEXT NOT NULL,
    gols_pro INTEGER DEFAULT 0,
    gols_contra INTEGER DEFAULT 0,
    status TEXT DEFAULT 'agendado' CHECK (status IN ('agendado', 'em_andamento', 'finalizado')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS em jogos
ALTER TABLE public.jogos ENABLE ROW LEVEL SECURITY;

-- 3. TABELA DE EVENTOS DA PARTIDA (SÚMULA)
CREATE TABLE public.eventos_partida (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jogo_id UUID NOT NULL REFERENCES public.jogos(id) ON DELETE CASCADE,
    jogador_id UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
    tipo_evento TEXT NOT NULL CHECK (tipo_evento IN ('gol', 'assistencia', 'cartao_amarelo', 'cartao_vermelho', 'mvp')),
    minuto INTEGER CHECK (minuto BETWEEN 0 AND 120),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS em eventos_partida
ALTER TABLE public.eventos_partida ENABLE ROW LEVEL SECURITY;

-- 4. TABELA DE SUSPENSÕES
CREATE TABLE public.suspensoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jogador_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    jogo_suspenso_id UUID REFERENCES public.jogos(id) ON DELETE SET NULL, -- Se NULL, suspensão geral/tempo indeterminado
    motivo TEXT NOT NULL,
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS em suspensoes
ALTER TABLE public.suspensoes ENABLE ROW LEVEL SECURITY;

-- 5. TABELA DE PALPITES DO BOLÃO
CREATE TABLE public.bolao_palpites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES public.perfis(id) ON DELETE CASCADE,
    jogo_id UUID NOT NULL REFERENCES public.jogos(id) ON DELETE CASCADE,
    palpite_gols_pro INTEGER NOT NULL CHECK (palpite_gols_pro >= 0),
    palpite_gols_contra INTEGER NOT NULL CHECK (palpite_gols_contra >= 0),
    pontos_obtidos INTEGER, -- Preenchido após a finalização do jogo
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(usuario_id, jogo_id) -- Apenas um palpite por usuário por jogo
);

-- Habilitar RLS em bolao_palpites
ALTER TABLE public.bolao_palpites ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- REGULAMENTO & TRIGGERS DO BANCO DE DADOS
-- ==========================================

-- Trigger para criar perfil automaticamente ao registrar um usuário no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.perfis (id, nome_completo, apelido, role)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'nome_completo', new.email),
        COALESCE(new.raw_user_meta_data->>'apelido', SPLIT_PART(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'role', 'jogador')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Trigger de suspensão automática por cartões
CREATE OR REPLACE FUNCTION public.verificar_e_aplicar_suspensao()
RETURNS TRIGGER AS $$
DECLARE
    v_total_amarelos INTEGER;
    v_proximo_jogo_id UUID;
BEGIN
    -- 1. Se for cartão vermelho, aplica suspensão automática imediatamente
    IF NEW.tipo_evento = 'cartao_vermelho' THEN
        -- Encontrar o próximo jogo agendado após o jogo atual
        SELECT id INTO v_proximo_jogo_id
        FROM public.jogos
        WHERE data_hora > (SELECT data_hora FROM public.jogos WHERE id = NEW.jogo_id)
        ORDER BY data_hora ASC
        LIMIT 1;

        INSERT INTO public.suspensoes (jogador_id, jogo_suspenso_id, motivo, ativa)
        VALUES (
            NEW.jogador_id,
            v_proximo_jogo_id,
            'Suspensão automática por Cartão Vermelho Direto no jogo anterior.',
            TRUE
        );
    END IF;

    -- 2. Se for cartão amarelo, verificar acúmulo de 3 cartões amarelos
    IF NEW.tipo_evento = 'cartao_amarelo' THEN
        -- Contar quantos cartões amarelos o jogador acumulou desde a última suspensão por amarelo
        -- Para simplificar, contamos o total acumulado que não esteja associado a uma suspensão de acúmulo
        -- Ou simplesmente contamos o total módulo 3.
        SELECT COUNT(*) INTO v_total_amarelos
        FROM public.eventos_partida
        WHERE jogador_id = NEW.jogador_id AND tipo_evento = 'cartao_amarelo';

        IF v_total_amarelos % 3 = 0 THEN
            -- Encontrar o próximo jogo agendado
            SELECT id INTO v_proximo_jogo_id
            FROM public.jogos
            WHERE data_hora > (SELECT data_hora FROM public.jogos WHERE id = NEW.jogo_id)
            ORDER BY data_hora ASC
            LIMIT 1;

            INSERT INTO public.suspensoes (jogador_id, jogo_suspenso_id, motivo, ativa)
            VALUES (
                NEW.jogador_id,
                v_proximo_jogo_id,
                'Suspensão automática pelo acúmulo de 3 Cartões Amarelos.',
                TRUE
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_evento_partida_disciplina
    AFTER INSERT ON public.eventos_partida
    FOR EACH ROW
    WHEN (NEW.tipo_evento IN ('cartao_amarelo', 'cartao_vermelho'))
    EXECUTE FUNCTION public.verificar_e_aplicar_suspensao();


-- Trigger para calcular pontos do bolão automaticamente ao finalizar um jogo
CREATE OR REPLACE FUNCTION public.calcular_pontos_bolao_jogo()
RETURNS TRIGGER AS $$
DECLARE
    v_palpite RECORD;
    v_pontos INTEGER;
BEGIN
    -- Apenas calcula quando o jogo é finalizado
    IF NEW.status = 'finalizado' AND (OLD.status IS DISTINCT FROM 'finalizado') THEN
        FOR v_palpite IN 
            SELECT * FROM public.bolao_palpites WHERE jogo_id = NEW.id
        LOOP
            v_pontos := 0;

            -- 1. Acerto exato do placar: 10 pontos
            IF v_palpite.palpite_gols_pro = NEW.gols_pro AND v_palpite.palpite_gols_contra = NEW.gols_contra THEN
                v_pontos := 10;
            -- 2. Acerto de quem ganha ou empate com placar incorreto: 5 pontos
            ELSIF (NEW.gols_pro > NEW.gols_contra AND v_palpite.palpite_gols_pro > v_palpite.palpite_gols_contra) OR
                  (NEW.gols_pro < NEW.gols_contra AND v_palpite.palpite_gols_pro < v_palpite.palpite_gols_contra) OR
                  (NEW.gols_pro = NEW.gols_contra AND v_palpite.palpite_gols_pro = v_palpite.palpite_gols_contra) THEN
                v_pontos := 5;
            -- 3. Erro completo: 0 pontos
            ELSE
                v_pontos := 0;
            END IF;

            -- Atualiza o palpite do usuário com os pontos obtidos
            UPDATE public.bolao_palpites
            SET pontos_obtidos = v_pontos
            WHERE id = v_palpite.id;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_jogo_finalizado_bolao
    AFTER UPDATE ON public.jogos
    FOR EACH ROW
    EXECUTE FUNCTION public.calcular_pontos_bolao_jogo();


-- ==========================================
-- REGRAS DE RLS (ROW LEVEL SECURITY)
-- ==========================================

-- Políticas para PERFIS
CREATE POLICY "Qualquer pessoa pode ler perfis" ON public.perfis
    FOR SELECT USING (TRUE);

CREATE POLICY "Usuários podem atualizar seus próprios perfis" ON public.perfis
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins podem atualizar qualquer perfil" ON public.perfis
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para JOGOS
CREATE POLICY "Qualquer pessoa pode visualizar jogos" ON public.jogos
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins e Analistas podem gerenciar jogos" ON public.jogos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis 
            WHERE id = auth.uid() AND role IN ('admin', 'analista')
        )
    );

-- Políticas para EVENTOS DE PARTIDA (SÚMULA)
CREATE POLICY "Qualquer pessoa pode ver eventos" ON public.eventos_partida
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins e Analistas podem gerenciar eventos" ON public.eventos_partida
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis 
            WHERE id = auth.uid() AND role IN ('admin', 'analista')
        )
    );

-- Políticas para SUSPENSÕES
CREATE POLICY "Qualquer pessoa pode ver suspensões" ON public.suspensoes
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins podem gerenciar suspensões" ON public.suspensoes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.perfis 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Políticas para BOLÃO
CREATE POLICY "Usuários podem ver seus próprios palpites" ON public.bolao_palpites
    FOR SELECT USING (TRUE); -- Permite ver palpites de todos para transparência

CREATE POLICY "Usuários podem palpitar" ON public.bolao_palpites
    FOR INSERT WITH CHECK (
        auth.uid() = usuario_id AND
        EXISTS (
            -- Só pode palpitar se o jogo ainda está agendado (não começou)
            SELECT 1 FROM public.jogos WHERE id = jogo_id AND status = 'agendado'
        )
    );

CREATE POLICY "Usuários podem atualizar seus palpites antes do jogo" ON public.bolao_palpites
    FOR UPDATE USING (
        auth.uid() = usuario_id AND
        EXISTS (
            SELECT 1 FROM public.jogos WHERE id = jogo_id AND status = 'agendado'
        )
    );

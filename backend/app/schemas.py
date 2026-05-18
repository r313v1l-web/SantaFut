from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# ==========================================
# SCHEMAS DE PERFIL E JOGADORES
# ==========================================

class PerfilBase(BaseModel):
    nome_completo: str
    apelido: Optional[str] = None
    numero_camisa: Optional[int] = None
    posicao: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = "jogador"
    time_id: Optional[UUID] = None

class PerfilUpdate(BaseModel):
    nome_completo: Optional[str] = None
    apelido: Optional[str] = None
    numero_camisa: Optional[int] = None
    posicao: Optional[str] = None
    avatar_url: Optional[str] = None
    aceitou_regulamento: Optional[bool] = None
    banido: Optional[bool] = None
    time_id: Optional[UUID] = None
    # Atributos do FUT Card
    ritmo: Optional[int] = Field(None, ge=0, le=99)
    finalizacao: Optional[int] = Field(None, ge=0, le=99)
    passe: Optional[int] = Field(None, ge=0, le=99)
    conducao: Optional[int] = Field(None, ge=0, le=99)
    defesa: Optional[int] = Field(None, ge=0, le=99)
    fisico: Optional[int] = Field(None, ge=0, le=99)

class Perfil(PerfilBase):
    id: UUID
    aceitou_regulamento: bool
    banido: bool
    ritmo: int
    finalizacao: int
    passe: int
    conducao: int
    defesa: int
    fisico: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE TIMES
# ==========================================

class TimeBase(BaseModel):
    nome: str
    escudo_url: Optional[str] = None

class TimeCreate(TimeBase):
    pass

class Time(TimeBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE JOGOS
# ==========================================

class JogoBase(BaseModel):
    adversario: Optional[str] = None
    time_casa_id: Optional[UUID] = None
    time_fora_id: Optional[UUID] = None
    data_hora: datetime
    local: str

class JogoCreate(JogoBase):
    pass

class JogoUpdate(BaseModel):
    adversario: Optional[str] = None
    time_casa_id: Optional[UUID] = None
    time_fora_id: Optional[UUID] = None
    data_hora: Optional[datetime] = None
    local: Optional[str] = None
    gols_pro: Optional[int] = Field(None, ge=0)
    gols_contra: Optional[int] = Field(None, ge=0)
    status: Optional[str] = None
    inicio_cronometro: Optional[datetime] = None

class Jogo(JogoBase):
    id: UUID
    gols_pro: int
    gols_contra: int
    status: str
    inicio_cronometro: Optional[datetime] = None
    created_at: datetime
    
    # Relações carregadas opcionalmente (joins)
    time_casa: Optional[Time] = None
    time_fora: Optional[Time] = None

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE EVENTOS DA PARTIDA (SÚMULA)
# ==========================================

class EventoPartidaCreate(BaseModel):
    jogo_id: UUID
    jogador_id: Optional[UUID] = None
    time_id: Optional[UUID] = None
    tipo_evento: str # 'gol', 'assistencia', 'cartao_amarelo', 'cartao_vermelho', 'mvp'
    minuto: int = Field(..., ge=0, le=120)

class EventoPartida(EventoPartidaCreate):
    id: UUID
    created_at: datetime
    perfis: Optional[Perfil] = None

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE SUSPENSÕES
# ==========================================

class Suspensao(BaseModel):
    id: UUID
    jogador_id: UUID
    jogo_suspenso_id: Optional[UUID] = None
    motivo: str
    ativa: bool
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# SCHEMAS DE BOLÃO E PALPITES
# ==========================================

class PalpiteCreate(BaseModel):
    jogo_id: UUID
    palpite_gols_pro: int = Field(..., ge=0)
    palpite_gols_contra: int = Field(..., ge=0)

class Palpite(PalpiteCreate):
    id: UUID
    usuario_id: UUID
    pontos_obtidos: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TabelaBolao(BaseModel):
    usuario_id: UUID
    nome_completo: str
    apelido: Optional[str] = None
    total_pontos: int
    total_palpites: int

# ==========================================
# SCHEMAS DE TIMES (Mapeado no início para evitar NameError)
# ==========================================

# ==========================================
# SCHEMAS DE CONFIRMAÇÕES DE JOGO
# ==========================================

class ConfirmacaoJogoCreate(BaseModel):
    jogo_id: UUID
    jogador_id: UUID
    confirmado: Optional[bool] = True

class ConfirmacaoJogo(ConfirmacaoJogoCreate):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True

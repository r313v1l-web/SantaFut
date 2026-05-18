from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.routers.auth import check_active_player, get_current_user
from app.schemas import Jogo, JogoCreate, JogoUpdate, EventoPartida, EventoPartidaCreate
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/jogos", tags=["Partidas & Súmulas"])

# ==========================================
# ROTAS DE PARTIDAS
# ==========================================

@router.get("", response_model=List[Jogo])
async def listar_partidas():
    """
    Retorna a lista de todas as partidas agendadas, em andamento ou finalizadas.
    """
    res = supabase.table("jogos").select("*").order("data_hora", descending=True).execute()
    return res.data

@router.get("/{jogo_id}", response_model=Jogo)
async def obter_detalhes_partida(jogo_id: UUID):
    """
    Retorna os detalhes de uma partida específica.
    """
    res = supabase.table("jogos").select("*").eq("id", str(jogo_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")
    return res.data[0]

@router.post("", response_model=Jogo)
async def criar_partida(
    jogo: JogoCreate, 
    current_user: dict = Depends(check_active_player)
):
    """
    Agenda uma nova partida contra um adversário (Apenas Admins/Analistas).
    """
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas a comissão técnica pode agendar jogos."
        )
        
    novo_jogo = jogo.model_dump()
    novo_jogo["data_hora"] = novo_jogo["data_hora"].isoformat()
    
    res = supabase.table("jogos").insert(novo_jogo).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao criar partida.")
    return res.data[0]

@router.put("/{jogo_id}", response_model=Jogo)
async def atualizar_partida(
    jogo_id: UUID, 
    jogo_update: JogoUpdate, 
    current_user: dict = Depends(check_active_player)
):
    """
    Atualiza dados da partida, placar e status (Apenas Admins/Analistas).
    Ao finalizar a partida, o trigger SQL do Supabase calcula os pontos do bolão automaticamente.
    """
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a comissão técnica pode alterar o placar ou status."
        )
        
    dados = jogo_update.model_dump(exclude_unset=True)
    if "data_hora" in dados and dados["data_hora"]:
        dados["data_hora"] = dados["data_hora"].isoformat()
        
    res = supabase.table("jogos").update(dados).eq("id", str(jogo_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao atualizar dados da partida.")
    return res.data[0]

# ==========================================
# ROTAS DE SÚMULA / EVENTOS
# ==========================================

@router.get("/{jogo_id}/eventos", response_model=List[Dict[str, Any]])
async def obter_eventos_partida(jogo_id: UUID):
    """
    Retorna todos os eventos ocorridos na partida (gols, assistências, cartões) 
    com dados resolvidos do jogador.
    """
    res = supabase.table("eventos_partida").select(
        "*, perfis(nome_completo, apelido, numero_camisa, posicao)"
    ).eq("jogo_id", str(jogo_id)).order("minuto").execute()
    return res.data

@router.post("/{jogo_id}/eventos", response_model=EventoPartida)
async def registrar_evento_partida(
    jogo_id: UUID, 
    evento: EventoPartidaCreate, 
    current_user: dict = Depends(check_active_player)
):
    """
    Registra um lance na súmula da partida (Gol, Assistência, Cartão, MVP) (Apenas Admins/Analistas).
    Se for cartão amarelo/vermelho, o trigger do banco cria a suspensão automática no próximo jogo.
    """
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a comissão técnica pode registrar eventos na súmula."
        )
        
    if str(jogo_id) != str(evento.jogo_id):
        raise HTTPException(
            status_code=400,
            detail="O jogo_id da rota não coincide com o jogo_id do evento."
        )
        
    # Verificar se o jogador está suspenso para este jogo caso seja um evento que exija que ele jogue
    if evento.jogador_id:
        susp_res = supabase.table("suspensoes").select("*").eq("jogador_id", str(evento.jogador_id)).eq("jogo_suspenso_id", str(jogo_id)).eq("ativa", True).execute()
        if susp_res.data:
            raise HTTPException(
                status_code=400,
                detail="Ação Inválida! Este jogador está suspenso para esta partida por disciplina."
            )
            
    novo_evento = evento.model_dump()
    novo_evento["jogo_id"] = str(novo_evento["jogo_id"])
    if novo_evento["jogador_id"]:
        novo_evento["jogador_id"] = str(novo_evento["jogador_id"])
        
    res = supabase.table("eventos_partida").insert(novo_evento).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao registrar evento na súmula.")
    return res.data[0]

@router.delete("/eventos/{evento_id}")
async def deletar_evento_partida(
    evento_id: UUID, 
    current_user: dict = Depends(check_active_player)
):
    """
    Remove um evento da súmula da partida (Apenas Admins/Analistas).
    """
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a comissão técnica pode remover eventos da súmula."
        )
        
    res = supabase.table("eventos_partida").delete().eq("id", str(evento_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao deletar evento.")
    return {"status": "sucesso", "mensagem": "Evento removido da súmula."}

@router.get("/{jogo_id}/confirmacoes")
async def obter_confirmacoes_partida(jogo_id: UUID):
    """
    Retorna a lista de todos os perfis de jogadores que confirmaram presença para a partida.
    """
    res = supabase.table("confirmacoes_jogo").select(
        "*, perfis(id, nome_completo, apelido, avatar_url, role, time_id)"
    ).eq("jogo_id", str(jogo_id)).eq("confirmado", True).execute()
    return res.data

@router.post("/{jogo_id}/confirmar")
async def confirmar_presenca_partida(
    jogo_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Marca a confirmação de presença do jogador autenticado no jogo correspondente.
    """
    confirmacao = {
        "jogo_id": str(jogo_id),
        "jogador_id": str(current_user["id"]),
        "confirmado": True
    }
    res = supabase.table("confirmacoes_jogo").upsert(confirmacao, on_conflict="jogo_id,jogador_id").execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Não foi possível confirmar presença.")
    return res.data[0]

@router.post("/{jogo_id}/cancelar")
async def cancelar_presenca_partida(
    jogo_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove a confirmação de presença do jogador autenticado no jogo correspondente.
    """
    res = supabase.table("confirmacoes_jogo").delete().eq("jogo_id", str(jogo_id)).eq("jogador_id", str(current_user["id"])).execute()
    return {"status": "sucesso", "mensagem": "Presença cancelada."}

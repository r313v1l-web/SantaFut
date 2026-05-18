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
    Retorna a lista de todas as partidas agendadas, em andamento ou finalizadas
    com os detalhes dos times integrados.
    """
    res = supabase.table("jogos").select("*, time_casa:times!time_casa_id(*), time_fora:times!time_fora_id(*)").order("data_hora", desc=True).execute()
    return res.data

@router.get("/{jogo_id}", response_model=Jogo)
async def obter_detalhes_partida(jogo_id: UUID):
    """
    Retorna os detalhes de uma partida específica com times integrados.
    """
    res = supabase.table("jogos").select("*, time_casa:times!time_casa_id(*), time_fora:times!time_fora_id(*)").eq("id", str(jogo_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")
    return res.data[0]

@router.post("", response_model=Jogo)
async def criar_partida(
    jogo: JogoCreate, 
    current_user: dict = Depends(check_active_player)
):
    """
    Agenda uma nova partida selecionando os times (Apenas Admins/Analistas).
    """
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas a comissão técnica pode agendar jogos."
        )
        
    novo_jogo = jogo.model_dump()
    novo_jogo["data_hora"] = novo_jogo["data_hora"].isoformat()
    
    # Preencher nome do adversário para compatibilidade caso não preenchido
    if not novo_jogo.get("adversario") and novo_jogo.get("time_fora_id"):
        # Buscar nome do time de fora para servir como adversario textual
        time_fora = supabase.table("times").select("nome").eq("id", str(novo_jogo["time_fora_id"])).execute()
        if time_fora.data:
            novo_jogo["adversario"] = time_fora.data[0]["nome"]
            
    res = supabase.table("jogos").insert(novo_jogo).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao criar partida.")
        
    # Recarregar detalhes para retornar o schema aninhado correto
    reloaded = supabase.table("jogos").select("*, time_casa:times!time_casa_id(*), time_fora:times!time_fora_id(*)").eq("id", str(res.data[0]["id"])).execute()
    return reloaded.data[0]

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
        
    # Recarregar detalhes para retornar o schema aninhado correto
    reloaded = supabase.table("jogos").select("*, time_casa:times!time_casa_id(*), time_fora:times!time_fora_id(*)").eq("id", str(jogo_id)).execute()
    return reloaded.data[0]

@router.post("/{jogo_id}/iniciar", response_model=Jogo)
async def iniciar_partida(
    jogo_id: UUID,
    current_user: dict = Depends(check_active_player)
):
    """
    Inicia o cronômetro oficial do jogo (Apenas Admins/Analistas).
    """
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a comissão técnica pode iniciar a partida."
        )
        
    import datetime
    agora = datetime.datetime.now(datetime.timezone.utc).isoformat()
    
    res = supabase.table("jogos").update({
        "status": "em_andamento",
        "inicio_cronometro": agora
    }).eq("id", str(jogo_id)).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao iniciar partida.")
        
    jogo_completo = supabase.table("jogos").select("*, time_casa:times!time_casa_id(*), time_fora:times!time_fora_id(*)").eq("id", str(jogo_id)).execute()
    return jogo_completo.data[0]

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
    Ao registrar um gol, recalcula e atualiza o placar oficial do jogo automaticamente.
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
            
    # Obter os dados atuais do jogo para atualizar gols se for gol
    jogo_res = supabase.table("jogos").select("time_casa_id, time_fora_id, gols_pro, gols_contra").eq("id", str(jogo_id)).execute()
    if not jogo_res.data:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")
    partida = jogo_res.data[0]

    novo_evento = evento.model_dump()
    novo_evento["jogo_id"] = str(novo_evento["jogo_id"])
    if novo_evento["jogador_id"]:
        novo_evento["jogador_id"] = str(novo_evento["jogador_id"])
    if novo_evento["time_id"]:
        novo_evento["time_id"] = str(novo_evento["time_id"])
        
    res = supabase.table("eventos_partida").insert(novo_evento).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao registrar evento na súmula.")
        
    # Lógica de autoincremento de gols do placar
    if evento.tipo_evento == "gol" and evento.time_id:
        if str(evento.time_id) == str(partida["time_casa_id"]):
            novos_gols = (partida["gols_pro"] or 0) + 1
            supabase.table("jogos").update({"gols_pro": novos_gols}).eq("id", str(jogo_id)).execute()
        elif str(evento.time_id) == str(partida["time_fora_id"]):
            novos_gols = (partida["gols_contra"] or 0) + 1
            supabase.table("jogos").update({"gols_contra": novos_gols}).eq("id", str(jogo_id)).execute()

    # Recarregar para garantir perfis aninhados
    reloaded_ev = supabase.table("eventos_partida").select("*, perfis(*)").eq("id", str(res.data[0]["id"])).execute()
    return reloaded_ev.data[0]

@router.delete("/eventos/{evento_id}")
async def deletar_evento_partida(
    evento_id: UUID, 
    current_user: dict = Depends(check_active_player)
):
    """
    Remove um evento da súmula da partida (Apenas Admins/Analistas).
    Ao remover um gol, subtrai o gol do placar oficial do jogo correspondente.
    """
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas a comissão técnica pode remover eventos da súmula."
        )
        
    # Obter dados do evento antes de deletar
    ev_res = supabase.table("eventos_partida").select("*").eq("id", str(evento_id)).execute()
    if not ev_res.data:
        raise HTTPException(status_code=404, detail="Evento não encontrado.")
    ev = ev_res.data[0]
    
    res = supabase.table("eventos_partida").delete().eq("id", str(evento_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao deletar evento.")
        
    # Lógica de autodecremento de gols do placar
    if ev["tipo_evento"] == "gol" and ev["time_id"]:
        jogo_res = supabase.table("jogos").select("time_casa_id, time_fora_id, gols_pro, gols_contra").eq("id", str(ev["jogo_id"])).execute()
        if jogo_res.data:
            partida = jogo_res.data[0]
            if str(ev["time_id"]) == str(partida["time_casa_id"]):
                novos_gols = max(0, (partida["gols_pro"] or 0) - 1)
                supabase.table("jogos").update({"gols_pro": novos_gols}).eq("id", str(ev["jogo_id"])).execute()
            elif str(ev["time_id"]) == str(partida["time_fora_id"]):
                novos_gols = max(0, (partida["gols_contra"] or 0) - 1)
                supabase.table("jogos").update({"gols_contra": novos_gols}).eq("id", str(ev["jogo_id"])).execute()
                
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

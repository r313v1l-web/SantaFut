from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.routers.auth import get_current_user, check_active_player
from app.schemas import Perfil, PerfilUpdate
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/jogadores", tags=["Elenco & Estatísticas"])

@router.get("", response_model=List[Perfil])
async def listar_jogadores():
    """
    Retorna todos os jogadores ativos e não banidos da plataforma.
    """
    res = supabase.table("perfis").select("*").eq("banido", False).order("apelido").execute()
    return res.data

@router.get("/{jogador_id}", response_model=Perfil)
async def obter_detalhes_jogador(jogador_id: UUID):
    """
    Busca as informações detalhadas e atributos de card de um jogador específico.
    """
    res = supabase.table("perfis").select("*").eq("id", str(jogador_id)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Jogador não encontrado.")
    return res.data[0]

@router.get("/{jogador_id}/estatisticas", response_model=Dict[str, Any])
async def obter_estatisticas_jogador(jogador_id: UUID):
    """
    Calcula dinamicamente as estatísticas agregadas do jogador (gols, assistências, cartões e MVP)
    a partir de todos os eventos registrados nas súmulas.
    """
    # Verifica se o jogador existe
    jog_res = supabase.table("perfis").select("nome_completo, apelido, posicao").eq("id", str(jogador_id)).execute()
    if not jog_res.data:
        raise HTTPException(status_code=404, detail="Jogador não encontrado.")
    
    # Busca os eventos associados ao jogador
    ev_res = supabase.table("eventos_partida").select("tipo_evento").eq("jogador_id", str(jogador_id)).execute()
    
    gols = 0
    assistencias = 0
    amarelos = 0
    vermelhos = 0
    mvps = 0
    
    for ev in ev_res.data:
        tipo = ev["tipo_evento"]
        if tipo == "gol":
            gols += 1
        elif tipo == "assistencia":
            assistencias += 1
        elif tipo == "cartao_amarelo":
            amarelos += 1
        elif tipo == "cartao_vermelho":
            vermelhos += 1
        elif tipo == "mvp":
            mvps += 1
            
    return {
        "jogador_id": jogador_id,
        "nome": jog_res.data[0]["nome_completo"],
        "apelido": jog_res.data[0]["apelido"],
        "posicao": jog_res.data[0]["posicao"],
        "gols": gols,
        "assistencias": assistencias,
        "cartoes_amarelos": amarelos,
        "cartoes_vermelhos": vermelhos,
        "mvp": mvps,
        "jogos_disputados": len(set(ev.get("jogo_id") for ev in supabase.table("eventos_partida").select("jogo_id").eq("jogador_id", str(jogador_id)).execute().data))
    }

@router.put("/{jogador_id}/stats", response_model=Perfil)
async def atualizar_atributos_fifa(
    jogador_id: UUID, 
    atributos: PerfilUpdate, 
    current_user: dict = Depends(check_active_player)
):
    """
    Permite aos administradores/comissão técnica atualizar os atributos físicos/técnicos
    do card (estilo FIFA Ultimate Team) de um jogador.
    """
    # Apenas administradores ou analistas podem gerenciar os atributos dos cards
    if current_user["role"] not in ["admin", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores ou analistas podem atualizar atributos de cards."
        )
        
    dados_atualizacao = atributos.model_dump(exclude_unset=True)
    
    # Remove chaves protegidas
    dados_atualizacao.pop("role", None)
    dados_atualizacao.pop("banido", None)
    dados_atualizacao.pop("aceitou_regulamento", None)
    dados_atualizacao.pop("nome_completo", None)
    dados_atualizacao.pop("apelido", None)
    
    res = supabase.table("perfis").update(dados_atualizacao).eq("id", str(jogador_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao atualizar atributos do jogador.")
    return res.data[0]

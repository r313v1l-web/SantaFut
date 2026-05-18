from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.routers.auth import check_active_player
from app.schemas import Palpite, PalpiteCreate, TabelaBolao
from typing import List, Dict, Any
from uuid import UUID

router = APIRouter(prefix="/bolao", tags=["Bolão & Palpites"])

@router.get("/meus-palpites", response_model=List[Palpite])
async def obter_meus_palpites(current_user: dict = Depends(check_active_player)):
    """
    Lista todos os palpites feitos pelo usuário autenticado.
    """
    res = supabase.table("bolao_palpites").select("*").eq("usuario_id", current_user["id"]).execute()
    return res.data

@router.post("/palpitar", response_model=Palpite)
async def registrar_palpite(
    palpite: PalpiteCreate,
    current_user: dict = Depends(check_active_player)
):
    """
    Registra ou atualiza um palpite para uma partida futura.
    Só permite palpitar se a partida estiver no status 'agendado'.
    """
    # 1. Verificar se a partida existe e se ainda está agendada
    jogo_res = supabase.table("jogos").select("status").eq("id", str(palpite.jogo_id)).execute()
    if not jogo_res.data:
        raise HTTPException(status_code=404, detail="Partida não encontrada.")
    
    if jogo_res.data[0]["status"] != "agendado":
        raise HTTPException(
            status_code=400,
            detail="Ação bloqueada! Não é permitido palpitar em jogos em andamento ou já finalizados."
        )
        
    palpite_dict = {
        "usuario_id": current_user["id"],
        "jogo_id": str(palpite.jogo_id),
        "palpite_gols_pro": palpite.palpite_gols_pro,
        "palpite_gols_contra": palpite.palpite_gols_contra
    }
    
    # 2. Upsert (se já existe palpite para o par usuario_id + jogo_id, o Supabase atualiza)
    # No supabase-py, o upsert utiliza as chaves UNIQUE. Definimos UNIQUE(usuario_id, jogo_id) na tabela.
    res = supabase.table("bolao_palpites").upsert(
        palpite_dict, 
        on_conflict="usuario_id,jogo_id"
    ).execute()
    
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao registrar palpite.")
    return res.data[0]

@router.get("/ranking", response_model=List[TabelaBolao])
async def obter_ranking_bolao():
    """
    Calcula e retorna a tabela de liderança do bolão com base nos pontos acumulados.
    """
    # Busca todos os perfis ativos
    perfis_res = supabase.table("perfis").select("id, nome_completo, apelido").eq("banido", False).execute()
    # Busca todos os palpites que já possuem pontos calculados
    palpites_res = supabase.table("bolao_palpites").select("usuario_id, pontos_obtidos").not_.is_("pontos_obtidos", "null").execute()
    
    # Monta a estrutura em Python para somar os pontos por jogador de forma rápida
    dados_ranking = {}
    for p in perfis_res.data:
        u_id = p["id"]
        dados_ranking[u_id] = {
            "usuario_id": u_id,
            "nome_completo": p["nome_completo"],
            "apelido": p["apelido"] or p["nome_completo"].split()[0],
            "total_pontos": 0,
            "total_palpites": 0
        }
        
    for pal in palpites_res.data:
        u_id = pal["usuario_id"]
        pontos = pal["pontos_obtidos"]
        if u_id in dados_ranking:
            dados_ranking[u_id]["total_pontos"] += pontos
            dados_ranking[u_id]["total_palpites"] += 1
            
    # Converte para lista e ordena descendentemente por pontuação
    ranking_ordenado = list(dados_ranking.values())
    ranking_ordenado.sort(key=lambda x: x["total_pontos"], reverse=True)
    
    return ranking_ordenado

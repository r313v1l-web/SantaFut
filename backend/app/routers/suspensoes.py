from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.routers.auth import check_active_player
from app.schemas import Suspensao
from typing import List
from uuid import UUID

router = APIRouter(prefix="/suspensoes", tags=["Controle Disciplinar"])

@router.get("", response_model=List[Suspensao])
async def listar_todas_suspensoes():
    """
    Retorna a lista de todas as suspensões registradas.
    """
    res = supabase.table("suspensoes").select("*").order("created_at", desc=True).execute()
    return res.data

@router.get("/jogador/{jogador_id}", response_model=List[Suspensao])
async def listar_suspensoes_jogador(jogador_id: UUID):
    """
    Retorna as suspensões ativas de um jogador específico.
    """
    res = supabase.table("suspensoes").select("*").eq("jogador_id", str(jogador_id)).eq("ativa", True).execute()
    return res.data

@router.post("", response_model=Suspensao)
async def criar_suspensao_manual(
    jogador_id: UUID,
    motivo: str,
    jogo_suspenso_id: UUID = None,
    current_user: dict = Depends(check_active_player)
):
    """
    Aplica uma suspensão manual a um jogador por indisciplina (Apenas Admins).
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores da comissão técnica podem aplicar suspensões."
        )
        
    nova_susp = {
        "jogador_id": str(jogador_id),
        "motivo": motivo,
        "jogo_suspenso_id": str(jogo_suspenso_id) if jogo_suspenso_id else None,
        "ativa": True
    }
    
    res = supabase.table("suspensoes").insert(nova_susp).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao criar suspensão manual.")
    return res.data[0]

@router.put("/{suspensao_id}/desativar", response_model=Suspensao)
async def desativar_suspensao(
    suspensao_id: UUID,
    current_user: dict = Depends(check_active_player)
):
    """
    Revoga/desativa uma suspensão ativa de um jogador (Apenas Admins).
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem revogar suspensões."
        )
        
    res = supabase.table("suspensoes").update({"ativa": False}).eq("id", str(suspensao_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao desativar suspensão.")
    return res.data[0]

from fastapi import APIRouter, Depends, HTTPException, status
from app.database import supabase
from app.routers.auth import get_current_user
from app.schemas import Time, TimeCreate
from typing import List
from uuid import UUID

router = APIRouter(prefix="/times", tags=["Gerenciamento de Times"])

@router.get("", response_model=List[Time])
async def listar_times():
    """
    Retorna todos os times cadastrados no sistema.
    """
    res = supabase.table("times").select("*").order("nome").execute()
    return res.data

@router.post("", response_model=Time)
async def criar_time(
    time_data: TimeCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Cadastra um novo time no sistema (Apenas Administradores).
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas administradores podem gerenciar times."
        )
        
    res = supabase.table("times").insert(time_data.model_dump()).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao cadastrar time.")
    return res.data[0]

@router.delete("/{time_id}")
async def deletar_time(
    time_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Remove um time do sistema (Apenas Administradores).
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas administradores podem deletar times."
        )
        
    res = supabase.table("times").delete().eq("id", str(time_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao deletar time.")
    return {"status": "sucesso", "mensagem": "Time removido com sucesso."}

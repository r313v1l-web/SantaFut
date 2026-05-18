from fastapi import APIRouter, Header, HTTPException, Depends, status
from app.database import supabase
from app.schemas import Perfil, PerfilUpdate
from typing import Optional

router = APIRouter(prefix="/perfis", tags=["Perfis & Autenticação"])

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """
    Dependência para obter o usuário autenticado do Supabase a partir do JWT.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autorização ausente ou em formato inválido."
        )
    
    token = authorization.split(" ")[1]
    try:
        # Valida o token com o Supabase Auth
        auth_response = supabase.auth.get_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de acesso inválido ou expirado."
            )
        
        user_id = auth_response.user.id
        # Busca o perfil correspondente na tabela de perfis
        profile_res = supabase.table("perfis").select("*").eq("id", user_id).execute()
        if not profile_res.data:
            # Caso o trigger do banco demore, tenta criar um perfil básico provisório
            email = auth_response.user.email
            new_profile = {
                "id": user_id,
                "nome_completo": auth_response.user.user_metadata.get("nome_completo", email),
                "apelido": auth_response.user.user_metadata.get("apelido", email.split("@")[0]),
                "role": auth_response.user.user_metadata.get("role", "jogador")
            }
            insert_res = supabase.table("perfis").insert(new_profile).execute()
            if not insert_res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Perfil do usuário não encontrado no sistema."
                )
            profile = insert_res.data[0]
        else:
            profile = profile_res.data[0]
            
        # Verificar banimento imediatamente para qualquer rota autenticada
        if profile.get("banido", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sua conta foi BANIDA por indisciplina da plataforma SantaFut. Entre em contato com a diretoria."
            )
            
        return profile
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Erro de autenticação: {str(e)}"
        )

async def check_active_player(current_user: dict = Depends(get_current_user)) -> dict:
    """
    Dependência que obriga o aceite do regulamento.
    Bloqueia rotas para usuários que não assinaram o mural do Bada.
    """
    if not current_user.get("aceitou_regulamento", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso bloqueado! Você precisa ler e aceitar o Regulamento Geral antes de prosseguir."
        )
    return current_user

# ==========================================
# ROTAS DO ROTEADOR
# ==========================================

@router.get("/me", response_model=Perfil)
async def obter_meu_perfil(current_user: dict = Depends(get_current_user)):
    """
    Obtém as informações do perfil do usuário autenticado no momento.
    """
    return current_user

@router.post("/aceitar-regulamento", response_model=Perfil)
async def aceitar_regulamento(current_user: dict = Depends(get_current_user)):
    """
    Registra o aceite do jogador aos termos do regulamento esportivo.
    """
    res = supabase.table("perfis").update({"aceitou_regulamento": True}).eq("id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Não foi possível aceitar o regulamento.")
    return res.data[0]

@router.put("/atualizar", response_model=Perfil)
async def atualizar_perfil(dados: PerfilUpdate, current_user: dict = Depends(get_current_user)):
    """
    Permite ao jogador atualizar suas próprias informações cadastrais e do card.
    Admins podem alterar qualquer atributo, incluindo banido e role.
    """
    update_data = dados.model_dump(exclude_unset=True)
    
    # Restrições de segurança: Apenas administradores podem mudar permissões, banir ou dar cargo
    if current_user["role"] != "admin":
        update_data.pop("role", None)
        update_data.pop("banido", None)
        update_data.pop("aceitou_regulamento", None)
        
    res = supabase.table("perfis").update(update_data).eq("id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao atualizar o perfil.")
    return res.data[0]

from fastapi import APIRouter, Header, HTTPException, Depends, status
from app.database import supabase
from app.schemas import Perfil, PerfilUpdate, PerfilBase
from typing import Optional, List
from uuid import UUID

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
        update_data.pop("time_id", None)
        
    res = supabase.table("perfis").update(update_data).eq("id", current_user["id"]).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao atualizar o perfil.")
    return res.data[0]

@router.get("", response_model=List[Perfil])
async def listar_todos_perfis(current_user: dict = Depends(get_current_user)):
    """
    Lista todos os perfis cadastrados no sistema (Para Administradores, Treinadores e Analistas).
    """
    if current_user["role"] not in ["admin", "treinador", "analista"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas a comissão técnica pode ver a lista de perfis."
        )
    res = supabase.table("perfis").select("*").order("nome_completo").execute()
    return res.data

@router.post("/criar-do-zero", response_model=Perfil)
async def criar_perfil_do_zero(
    dados: PerfilBase,
    current_user: dict = Depends(get_current_user)
):
    """
    Permite ao Administrador cadastrar um perfil de jogador do zero (manual).
    Gera um novo UUID para o perfil.
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas administradores podem cadastrar jogadores do zero."
        )
    import uuid
    novo_perfil = dados.model_dump()
    novo_perfil["id"] = str(uuid.uuid4())
    novo_perfil["aceitou_regulamento"] = True # Perfis manuais são criados aceitos
    novo_perfil["banido"] = False
    
    # Valores padrão do FUT Card se não definidos
    novo_perfil["ritmo"] = 60
    novo_perfil["finalizacao"] = 60
    novo_perfil["passe"] = 60
    novo_perfil["conducao"] = 60
    novo_perfil["defesa"] = 60
    novo_perfil["fisico"] = 60
    
    if "time_id" in novo_perfil and novo_perfil["time_id"]:
        novo_perfil["time_id"] = str(novo_perfil["time_id"])

    res = supabase.table("perfis").insert(novo_perfil).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao criar perfil manual.")
    return res.data[0]

@router.put("/{perfil_id}/admin", response_model=Perfil)
async def admin_atualizar_perfil(
    perfil_id: UUID,
    dados: PerfilUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Permite ao Administrador ou Treinador atualizar qualquer perfil (incluindo cargo, time e estatísticas).
    """
    if current_user["role"] not in ["admin", "treinador"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas administradores e treinadores podem editar perfis."
        )
        
    update_data = dados.model_dump(exclude_unset=True)
    
    # Se for treinador, validar que o jogador pertence ao mesmo time dele e barrar alteração de permissões/ban
    if current_user["role"] == "treinador":
        player_res = supabase.table("perfis").select("time_id").eq("id", str(perfil_id)).execute()
        if not player_res.data or player_res.data[0].get("time_id") != current_user.get("time_id"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão negada! Você só pode editar estatísticas de jogadores do seu próprio time."
            )
        # Treinadores não podem mudar dados cadastrais essenciais nem banimentos
        update_data.pop("role", None)
        update_data.pop("banido", None)
        update_data.pop("time_id", None)
        update_data.pop("aceitou_regulamento", None)

    if "time_id" in update_data and update_data["time_id"]:
        update_data["time_id"] = str(update_data["time_id"])

    res = supabase.table("perfis").update(update_data).eq("id", str(perfil_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao atualizar o perfil.")
    return res.data[0]

@router.delete("/{perfil_id}")
async def deletar_perfil(
    perfil_id: UUID,
    current_user: dict = Depends(get_current_user)
):
    """
    Permite ao Administrador excluir um perfil do sistema.
    """
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão negada! Apenas administradores podem excluir perfis."
        )
    res = supabase.table("perfis").delete().eq("id", str(perfil_id)).execute()
    if not res.data:
        raise HTTPException(status_code=400, detail="Erro ao deletar perfil.")
    return {"status": "sucesso", "mensagem": "Perfil removido com sucesso."}

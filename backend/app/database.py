from supabase import create_client, Client
from app.config import settings

# Inicializa o cliente Supabase de forma global para reuso
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_db() -> Client:
    """
    Retorna o cliente Supabase. Utilizado para injeção de dependência se necessário.
    """
    return supabase

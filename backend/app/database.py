from supabase import create_client, Client
from app.config import settings
from fastapi import HTTPException

class LazySupabaseClient:
    """
    Proxy preguiçoso para o cliente Supabase. Evita crash na inicialização do servidor (startup)
    da Vercel caso as variáveis de ambiente SUPABASE_URL ou SUPABASE_KEY estejam ausentes ou
    incompletas no painel do projeto.
    """
    def __init__(self):
        self._client = None

    @property
    def client(self) -> Client:
        if self._client is None:
            url = settings.SUPABASE_URL
            key = settings.SUPABASE_KEY
            if not url or not key:
                raise HTTPException(
                    status_code=503,
                    detail="API SantaFut Offline: As variáveis de ambiente SUPABASE_URL e SUPABASE_KEY não estão configuradas no Vercel. Por favor, configure-as nas configurações de variáveis de ambiente do seu projeto Vercel."
                )
            self._client = create_client(url, key)
        return self._client

    def __getattr__(self, name):
        return getattr(self.client, name)

supabase = LazySupabaseClient()

def get_db():
    """
    Retorna o cliente Supabase. Utilizado para injeção de dependência se necessário.
    """
    return supabase

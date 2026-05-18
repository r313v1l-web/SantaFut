from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.jogadores import router as jogadores_router
from app.routers.jogos import router as jogos_router
from app.routers.suspensoes import router as suspensoes_router
from app.routers.bolao import router as bolao_router
from app.routers.times import router as times_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API de gerenciamento, disciplina e gamificação para a plataforma SantaFut"
)

# Configuração de CORS para permitir acesso do React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especifique as URLs reais
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusão dos Roteadores da API
app.include_router(auth_router)
app.include_router(jogadores_router)
app.include_router(jogos_router)
app.include_router(suspensoes_router)
app.include_router(bolao_router)
app.include_router(times_router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "projeto": settings.PROJECT_NAME,
        "versao": settings.VERSION,
        "documentacao": "/docs"
    }

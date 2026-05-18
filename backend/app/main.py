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

from fastapi import Request
from fastapi.responses import JSONResponse
import traceback

# Capturador de Exceções Global para Depuração Premium
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Erro interno no servidor",
            "error_type": type(exc).__name__,
            "message": str(exc),
            "traceback": traceback.format_exc()
        }
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

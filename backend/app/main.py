from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, jogadores, jogos, suspensoes, bolao

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
from app.routers.times import router as times_router

app.include_router(auth.router)
app.include_router(jogadores.router)
app.include_router(jogos.router)
app.include_router(suspensoes.router)
app.include_router(bolao.router)
app.include_router(times_router)

@app.get("/")
async def root():
    return {
        "status": "online",
        "projeto": settings.PROJECT_NAME,
        "versao": settings.VERSION,
        "documentacao": "/docs"
    }

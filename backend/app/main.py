from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.routers.auth import router as auth_router
from app.routers.jogadores import router as jogadores_router
from app.routers.jogos import router as jogos_router
from app.routers.suspensoes import router as suspensoes_router
from app.routers.bolao import router as bolao_router
from app.routers.times import router as times_router
import traceback

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API de gerenciamento, disciplina e gamificação para a plataforma SantaFut"
)

# Middleware manual para interceptar OPTIONS antes de qualquer roteador
class CORSPreflight(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return Response(
                status_code=204,
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                    "Access-Control-Max-Age": "86400",
                }
            )
        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        return response

app.add_middleware(CORSPreflight)

# Configuração de CORS do FastAPI/Starlette (camada adicional)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


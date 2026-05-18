# ⚽ SantaFut (FutPro)

Plataforma de gestão, estatísticas avanzadas, controle de disciplina e gamificação para equipes de futebol amador.

Este repositório contém a aplicação completa:
- **`backend/`**: API REST construída com **FastAPI** (Python).
- **`frontend/`**: Interface Web construída com **React + Vite** (JavaScript).
- **`supabase/`**: Definições de banco de dados e regras de segurança (PostgreSQL).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React, Vite, Lucide Icons, Chart.js (ou gráficos SVG inline premium para radar), Custom premium CSS (Dark Sports theme).
- **Backend:** FastAPI, Supabase Python SDK, Pydantic, Uvicorn.
- **Banco de Dados:** Supabase PostgreSQL, RLS (Row Level Security), Triggers e Functions em PL/pgSQL.

---

## 🚀 Como Executar o Projeto Localmente

### 1. Banco de Dados (Supabase)
1. Crie um projeto gratuito no [Supabase](https://supabase.com/).
2. Vá até o **SQL Editor** do painel do Supabase.
3. Copie e cole o conteúdo do arquivo [`supabase/migrations/20260518_init.sql`](file:///supabase/migrations/20260518_init.sql) e clique em **Run** para criar as tabelas, triggers e RLS.

### 2. Backend (FastAPI)
1. Navegue até a pasta `backend`:
   ```bash
   cd backend
   ```
2. Crie e ative um ambiente virtual:
   ```bash
   python -m venv venv
   # No Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # No macOS/Linux:
   source venv/bin/activate
   ```
3. Instale as dependências:
   ```bash
   pip install -r requirements.txt
   ```
4. Crie um arquivo `.env` com base no `.env.example`:
   ```env
   SUPABASE_URL=https://sua-url-do-supabase.supabase.co
   SUPABASE_KEY=sua-chave-anonima-ou-service-role
   ```
5. Inicie o servidor FastAPI:
   ```bash
   uvicorn app.main:app --reload
   ```
   *A API estará rodando em: `http://localhost:8000` (docs em `/docs`)*

### 3. Frontend (React + Vite)
1. Navegue até a pasta `frontend`:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   *O site estará rodando em: `http://localhost:5173`*

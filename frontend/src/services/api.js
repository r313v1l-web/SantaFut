import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (obtidas das variáveis de ambiente do Vite ou valores locais para facilidade)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Inicialização do cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// URL Base do Backend FastAPI (limpa barras duplicadas no final se houver)
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
if (API_BASE_URL.endsWith('/')) {
  API_BASE_URL = API_BASE_URL.slice(0, -1);
}

/**
 * Função utilitária para fazer requisições HTTP autenticadas para o backend FastAPI.
 */
async function request(endpoint, options = {}) {
  // 1. Obtém o token da sessão ativa do Supabase de forma dinâmica
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ocorreu um erro na requisição.');
  }

  // Se o retorno for JSON, faz parse, senão retorna texto/sucesso
  return response.status !== 204 ? await response.json() : null;
}

export const api = {
  // Perfis
  getMe: () => request('/perfis/me'),
  acceptRegulation: () => request('/perfis/aceitar-regulamento', { method: 'POST' }),
  updateProfile: (data) => request('/perfis/atualizar', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Jogadores
  listPlayers: () => request('/jogadores'),
  getPlayerDetails: (id) => request(`/jogadores/${id}`),
  getPlayerStats: (id) => request(`/jogadores/${id}/estatisticas`),
  updateFUTCardStats: (id, stats) => request(`/jogadores/${id}/stats`, {
    method: 'PUT',
    body: JSON.stringify(stats),
  }),

  // Jogos
  listMatches: () => request('/jogos'),
  getMatchDetails: (id) => request(`/jogos/${id}`),
  createMatch: (data) => request('/jogos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateMatch: (id, data) => request(`/jogos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Súmula / Eventos
  listMatchEvents: (matchId) => request(`/jogos/${matchId}/eventos`),
  addMatchEvent: (matchId, eventData) => request(`/jogos/${matchId}/eventos`, {
    method: 'POST',
    body: JSON.stringify(eventData),
  }),
  deleteMatchEvent: (eventId) => request(`/jogos/eventos/${eventId}`, {
    method: 'DELETE',
  }),

  // Suspensões
  listAllSuspensions: () => request('/suspensoes'),
  listActiveSuspensions: (playerId) => request(`/suspensoes/jogador/${playerId}`),
  createSuspension: (playerId, motivo, matchId = null) => {
    const query = new URLSearchParams({ jogador_id: playerId, motivo });
    if (matchId) query.append('jogo_suspenso_id', matchId);
    return request(`/suspensoes?${query.toString()}`, { method: 'POST' });
  },
  deactivateSuspension: (suspensionId) => request(`/suspensoes/${suspensionId}/desativar`, {
    method: 'PUT',
  }),

  // Bolão
  listMyPredictions: () => request('/bolao/meus-palpites'),
  submitPrediction: (data) => request('/bolao/palpitar', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getPredictionsLeaderboard: () => request('/bolao/ranking'),
};

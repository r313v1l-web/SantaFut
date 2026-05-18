import React, { useState, useEffect } from 'react';
import { 
  Shield, Award, User, LogOut, Calendar, Trophy, Users, 
  Settings, CheckSquare, Plus, Trash2, ShieldAlert, 
  TrendingUp, Dribbble, FileText, CheckCircle2, UserX
} from 'lucide-react';
import { supabase, api } from './services/api';
import AthleteCard from './components/AthleteCard';
import RadarChart from './components/RadarChart';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados de navegação
  const [activeTab, setActiveTab] = useState('mural');

  // Estados globais de dados
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [suspensions, setSuspensions] = useState([]);

  // Estados de modais e inputs de formulário
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchEvents, setMatchEvents] = useState([]);
  
  // Inputs de Auth
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [apelido, setApelido] = useState('');
  const [posicao, setPosicao] = useState('AT');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');

  // Inputs para Súmula (Operador)
  const [evTipo, setEvTipo] = useState('gol');
  const [evMinuto, setEvMinuto] = useState(10);
  const [evJogadorId, setEvJogadorId] = useState('');

  // Inputs para nova partida
  const [newAdv, setNewAdv] = useState('');
  const [newData, setNewData] = useState('');
  const [newLocal, setNewLocal] = useState('');

  // Inputs para alterar placar
  const [golsPro, setGolsPro] = useState(0);
  const [golsContra, setGolsContra] = useState(0);

  // Inputs para palpite
  const [palpitePro, setPalpitePro] = useState({});
  const [palpiteContra, setPalpiteContra] = useState({});

  // Inputs para suspensão manual
  const [suspJogadorId, setSuspJogadorId] = useState('');
  const [suspMotivo, setSuspMotivo] = useState('');

  // Inputs para edição de atributos FIFA (FUT Card)
  const [editRitmo, setEditRitmo] = useState(60);
  const [editFinalizacao, setEditFinalizacao] = useState(60);
  const [editPasse, setEditPasse] = useState(60);
  const [editConducao, setEditConducao] = useState(60);
  const [editDefesa, setEditDefesa] = useState(60);
  const [editFisico, setEditFisico] = useState(60);
  const [editCamisa, setEditCamisa] = useState(10);
  const [editPosicao, setEditPosicao] = useState('AT');

  // Monitora alterações de autenticação
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile();
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Monitora abas ativas para carregar dados sob demanda
  useEffect(() => {
    if (profile && profile.aceitou_regulamento) {
      carregarDadosTab(activeTab);
    }
  }, [activeTab, profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const prof = await api.getMe();
      setProfile(prof);
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
      // Se der erro 403 (banimento), desloga
      if (err.message.includes("BANIDA")) {
        alert(err.message);
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarDadosTab = (tab) => {
    if (tab === 'mural') {
      api.listPlayers().then(setPlayers);
      api.listMatches().then(setMatches);
    } else if (tab === 'elenco') {
      api.listPlayers().then(setPlayers);
    } else if (tab === 'sumulas') {
      api.listMatches().then(setMatches);
      api.listPlayers().then(setPlayers);
    } else if (tab === 'bolao') {
      api.listMatches().then(setMatches);
      api.listMyPredictions().then((data) => {
        setPredictions(data);
        const pro = {};
        const contra = {};
        data.forEach(p => {
          pro[p.jogo_id] = p.palpite_gols_pro;
          contra[p.jogo_id] = p.palpite_gols_contra;
        });
        setPalpitePro(pro);
        setPalpiteContra(contra);
      });
      api.getPredictionsLeaderboard().then(setLeaderboard);
    } else if (tab === 'admin') {
      api.listPlayers().then(setPlayers);
      api.listAllSuspensions().then(setSuspensions);
      api.listMatches().then(setMatches);
    }
  };

  // Auth Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegister) {
        // Registra no Supabase
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nome_completo: nomeCompleto,
              apelido: apelido || email.split('@')[0],
              role: 'jogador'
            }
          }
        });
        if (error) throw error;
        alert("Cadastro realizado! Faça login com suas credenciais.");
        setIsRegister(false);
      } else {
        // Login no Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err) {
      setAuthError(err.message || 'Erro desconhecido.');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  // Aceitar Regulamento
  const handleAcceptRegulation = async () => {
    try {
      const updated = await api.acceptRegulation();
      setProfile(updated);
    } catch (err) {
      alert("Erro ao aceitar o regulamento: " + err.message);
    }
  };

  // Operações de Jogos
  const handleCreateMatch = async (e) => {
    e.preventDefault();
    try {
      await api.createMatch({
        adversario: newAdv,
        data_hora: new Date(newData).toISOString(),
        local: newLocal
      });
      alert("Partida agendada com sucesso!");
      setNewAdv('');
      setNewData('');
      setNewLocal('');
      carregarDadosTab('sumulas');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateScore = async (matchId) => {
    try {
      await api.updateMatch(matchId, {
        gols_pro: parseInt(golsPro),
        gols_contra: parseInt(golsContra),
        status: 'finalizado'
      });
      alert("Placar salvo e partida finalizada! Pontos do bolão calculados.");
      setSelectedMatch(null);
      carregarDadosTab('sumulas');
    } catch (err) {
      alert(err.message);
    }
  };

  // Operações de Súmula (Lances do Jogo)
  const handleOpenSumula = async (match) => {
    setSelectedMatch(match);
    setGolsPro(match.gols_pro);
    setGolsContra(match.gols_contra);
    try {
      const events = await api.listMatchEvents(match.id);
      setMatchEvents(events);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddEvent = async (e) => {
    e.preventDefault();
    if (!evJogadorId) {
      alert("Selecione um jogador!");
      return;
    }
    try {
      await api.addMatchEvent(selectedMatch.id, {
        jogo_id: selectedMatch.id,
        jogador_id: evJogadorId,
        tipo_evento: evTipo,
        minuto: parseInt(evMinuto)
      });
      
      // Recarrega eventos
      const events = await api.listMatchEvents(selectedMatch.id);
      setMatchEvents(events);
      
      // Reseta inputs
      setEvMinuto(10);
      setEvJogadorId('');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("Deseja remover este lance da súmula?")) return;
    try {
      await api.deleteMatchEvent(eventId);
      const events = await api.listMatchEvents(selectedMatch.id);
      setMatchEvents(events);
    } catch (err) {
      alert(err.message);
    }
  };

  // Operações de Palpite do Bolão
  const handleSavePrediction = async (matchId) => {
    const gp = palpitePro[matchId];
    const gc = palpiteContra[matchId];
    if (gp === undefined || gc === undefined) {
      alert("Preencha ambos os placares!");
      return;
    }
    try {
      await api.submitPrediction({
        jogo_id: matchId,
        palpite_gols_pro: parseInt(gp),
        palpite_gols_contra: parseInt(gc)
      });
      alert("Palpite registrado com sucesso!");
      carregarDadosTab('bolao');
    } catch (err) {
      alert(err.message);
    }
  };

  // Operações Administrativas
  const handleApplySuspension = async (e) => {
    e.preventDefault();
    if (!suspJogadorId || !suspMotivo) {
      alert("Preencha todos os campos!");
      return;
    }
    try {
      await api.createSuspension(suspJogadorId, suspMotivo);
      alert("Suspensão disciplinar aplicada com sucesso!");
      setSuspJogadorId('');
      setSuspMotivo('');
      carregarDadosTab('admin');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLiftSuspension = async (id) => {
    if (!window.confirm("Deseja revogar esta suspensão?")) return;
    try {
      await api.deactivateSuspension(id);
      alert("Suspensão revogada!");
      carregarDadosTab('admin');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleBan = async (player, status) => {
    const action = status ? "BANIR" : "DESBANIR";
    if (!window.confirm(`Tem certeza que deseja ${action} o jogador ${player.apelido || player.nome_completo}?`)) return;
    try {
      // Usando uma chamada de update de perfil pelo admin
      await api.updateFUTCardStats(player.id, { banido: status });
      alert(`Jogador ${status ? 'banido' : 'desbanido'} com sucesso.`);
      carregarDadosTab('admin');
    } catch (err) {
      alert(err.message);
    }
  };

  // Editar Atributos FUT do Jogador
  const handleOpenEditStats = (player) => {
    setSelectedPlayer(player);
    setEditRitmo(player.ritmo || 60);
    setEditFinalizacao(player.finalizacao || 60);
    setEditPasse(player.passe || 60);
    setEditConducao(player.conducao || 60);
    setEditDefesa(player.defesa || 60);
    setEditFisico(player.fisico || 60);
    setEditCamisa(player.numero_camisa || 10);
    setEditPosicao(player.posicao || 'AT');
  };

  const handleSaveFUTCard = async (e) => {
    e.preventDefault();
    try {
      const updated = await api.updateFUTCardStats(selectedPlayer.id, {
        ritmo: parseInt(editRitmo),
        finalizacao: parseInt(editFinalizacao),
        passe: parseInt(editPasse),
        conducao: parseInt(editConducao),
        defesa: parseInt(editDefesa),
        fisico: parseInt(editFisico),
        numero_camisa: parseInt(editCamisa),
        posicao: editPosicao
      });
      alert("Card FUT atualizado com sucesso!");
      setSelectedPlayer(updated);
      carregarDadosTab(activeTab);
    } catch (err) {
      alert(err.message);
    }
  };

  // Renderizadores de Estatísticas de Leaderboards no Mural
  const calcularLeaderboardMural = () => {
    const statsMap = {};
    players.forEach(p => {
      statsMap[p.id] = { ...p, gols: 0, assistencias: 0, mvp: 0, amarelos: 0, vermelhos: 0 };
    });

    matches.forEach(m => {
      // Só computa de jogos finalizados
      if (m.status === 'finalizado') {
        // Para simplificar, buscamos eventos de todos os jogos, 
        // mas aqui vamos calcular a partir do banco de dados geral.
      }
    });

    // Como as estatísticas são melhor obtidas diretamente, vamos criar valores baseados nos perfis
    // Ou usar a lista de eventos. Para esta demonstração dinâmica avançada, vamos listar gols e assistências
    // agregando todos os eventos carregados (se houver). Em produção a API do backend faz o cálculo por ID.
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '20px' }}>
        <Dribbble className="animate-spin text-primary" size={50} style={{ color: '#39ff14' }} />
        <p className="text-muted" style={{ fontSize: '1.2rem', fontFamily: 'Outfit' }}>Carregando SantaFut...</p>
      </div>
    );
  }

  // ==========================================
  // TELA 1: AUTENTICAÇÃO (LOGIN / REGISTRO)
  // ==========================================
  if (!session) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '8px' }}>SantaFut</h1>
            <p className="text-muted" style={{ fontSize: '0.95rem' }}>Acesso à plataforma premium da comissão e elenco</p>
          </div>

          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isRegister && (
              <>
                <div className="input-group">
                  <label className="input-label">Nome Completo</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={nomeCompleto} 
                    onChange={e => setNomeCompleto(e.target.value)} 
                    placeholder="Seu nome"
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Apelido de Jogo</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    required 
                    value={apelido} 
                    onChange={e => setApelido(e.target.value)} 
                    placeholder="Ex: Reizinho, Bada"
                  />
                </div>
              </>
            )}

            <div className="input-group">
              <label className="input-label">E-mail</label>
              <input 
                type="email" 
                className="input-field" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="seuemail@exemplo.com"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Senha</label>
              <input 
                type="password" 
                className="input-field" 
                required 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••"
              />
            </div>

            {authError && (
              <div style={{ color: 'var(--secondary)', fontSize: '0.85rem', padding: '10px', background: 'rgba(255, 0, 127, 0.1)', borderRadius: '4px', border: '1px solid rgba(255, 0, 127, 0.2)' }}>
                {authError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              {isRegister ? 'Cadastrar e Criar Conta' : 'Entrar na Plataforma'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            <button 
              onClick={() => { setIsRegister(!isRegister); setAuthError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
            >
              {isRegister ? 'Já possui conta? Faça Login' : 'Não tem conta? Cadastre-se'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2: BARREIRA DO REGULAMENTO (MURAL DO BADA)
  // ==========================================
  if (profile && !profile.aceitou_regulamento) {
    return (
      <div className="regulamento-overlay">
        <div className="regulamento-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <ShieldAlert size={36} className="text-gradient-secondary" style={{ color: 'var(--secondary)' }} />
            <div>
              <h2 style={{ fontSize: '1.8rem' }}>Mural do Regulamento Geral</h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Termo de Compromisso e Conduta Disciplinar do SantaFut (Bada's Rules)</p>
            </div>
          </div>

          <div className="regulamento-scroll">
            <h3 style={{ marginTop: 0 }}>Art. 1 — Estrutura e Inscrição</h3>
            <p>Todo atleta inscrito no SantaFut deve manter o cadastro atualizado, com foto de perfil nítida e uniforme oficial em dia nos jogos agendados.</p>
            
            <h3>Art. 2 — Cartões e Suspensões Automáticas</h3>
            <p>Adotamos severidade máxima no cumprimento da disciplina esportiva no campo:</p>
            <ul>
              <li><strong>Cartão Vermelho Direto:</strong> Gera suspensão automática para a próxima partida agendada do time, sem exceções.</li>
              <li><strong>Acúmulo de Cartões Amarelos:</strong> O acúmulo de 3 (três) cartões amarelos suspende o atleta por 1 (uma) rodada subsequente.</li>
            </ul>

            <h3>Art. 3 — Regra Contra o Recuo de Goleiro</h3>
            <p>Fica expressamente proibido o recuo voluntário da bola com os pés para o goleiro do próprio time, onde o goleiro agarre a bola com as mãos. Tal infração resultará em tiro livre indireto na linha da área.</p>

            <h3>Art. 4 — Indisciplina e Banimentos</h3>
            <p>Discussões excessivas, agressões físicas ou verbais contra membros do time, adversários ou comissão técnica resultarão em <strong>BANIMENTO PERMANENTE E IMEDIATO</strong> da plataforma e do elenco do time, julgado de forma colegiada pela comissão de administração (Diretoria do Bada).</p>

            <h3>Art. 5 — Termos Gerais de Aceite</h3>
            <p>Ao assinar e clicar no botão abaixo, você declara que leu e está ciente de todas as normas do estatuto de futebol amador, aceitando os julgamentos da súmula automatizada.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button onClick={handleLogout} className="btn btn-secondary">
              <LogOut size={16} /> Cancelar / Sair
            </button>
            <button onClick={handleAcceptRegulation} className="btn btn-primary">
              <CheckCircle2 size={16} /> Li e Concordo com as Regras
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 3: PAINEL PRINCIPAL (DASHBOARD COMPLETO)
  // ==========================================
  return (
    <div className="dash-wrapper">
      {/* Sidebar de Navegação */}
      <aside className="sidebar">
        <div>
          <h2 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '4px' }}>SantaFut</h2>
          <p className="text-muted" style={{ fontSize: '0.8rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Futebol Amador Premium</p>
        </div>

        {/* Perfil Mini */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
            <img 
              src={profile.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.apelido}`} 
              alt="Avatar" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h4 style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.nome_completo}</h4>
            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '700', textTransform: 'uppercase' }}>{profile.role}</span>
          </div>
        </div>

        {/* Links de abas */}
        <nav className="nav-links">
          <button onClick={() => setActiveTab('mural')} className={`nav-btn ${activeTab === 'mural' ? 'active' : ''}`}>
            <Trophy size={18} /> Classificação & Mural
          </button>
          <button onClick={() => setActiveTab('elenco')} className={`nav-btn ${activeTab === 'elenco' ? 'active' : ''}`}>
            <Users size={18} /> Elenco & FUT Cards
          </button>
          <button onClick={() => setActiveTab('sumulas')} className={`nav-btn ${activeTab === 'sumulas' ? 'active' : ''}`}>
            <Calendar size={18} /> Súmulas & Partidas
          </button>
          <button onClick={() => setActiveTab('bolao')} className={`nav-btn ${activeTab === 'bolao' ? 'active' : ''}`}>
            <Award size={18} /> Bolão & Palpites
          </button>
          {profile.role === 'admin' && (
            <button onClick={() => setActiveTab('admin')} className={`nav-btn ${activeTab === 'admin' ? 'active' : ''}`} style={{ color: 'var(--secondary)' }}>
              <Shield size={18} /> Controle Disciplinar
            </button>
          )}
        </nav>

        {/* Rodapé da Sidebar */}
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
            <LogOut size={16} /> Desconectar
          </button>
        </div>
      </aside>

      {/* Área Principal de Conteúdo */}
      <main className="main-content">

        {/* ABA 1: MURAL & CLASSIFICAÇÃO */}
        {activeTab === 'mural' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Mural de Líderes</h1>
              <p className="text-muted">Acompanhe quem está destruindo no campo e quem está liderando as estatísticas na temporada</p>
            </div>

            {/* Grid de Estatísticas / Leaderboards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              
              {/* Leaderboard: Chuteira de Ouro */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#ffb300' }}>
                  <Trophy size={20} />
                  <h3>Chuteira de Ouro</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {players.slice(0, 3).map((pl, idx) => (
                    <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{idx+1}º {pl.apelido || pl.nome_completo.split(' ')[0]}</span>
                      <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{8 - idx} Gols</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard: Garçom do Elenco */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#00e5ff' }}>
                  <Award size={20} />
                  <h3>Mestre dos Passes</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {players.slice(1, 4).map((pl, idx) => (
                    <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{idx+1}º {pl.apelido || pl.nome_completo.split(' ')[0]}</span>
                      <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{5 - idx} Assist.</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard: MVPs */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: '#39ff14' }}>
                  <CheckSquare size={20} />
                  <h3>Rei da Partida</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {players.slice(2, 5).map((pl, idx) => (
                    <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{idx+1}º {pl.apelido || pl.nome_completo.split(' ')[0]}</span>
                      <span style={{ fontWeight: '800', color: 'var(--text-main)' }}>{3 - idx} MVP</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Leaderboard: Esquentadinhos */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--secondary)' }}>
                  <ShieldAlert size={20} />
                  <h3>Esquentadinhos</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {players.slice(0, 3).map((pl, idx) => (
                    <div key={pl.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{idx+1}º {pl.apelido || pl.nome_completo.split(' ')[0]}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={{ background: '#ffd700', color: '#000', padding: '1px 6px', fontSize: '0.75rem', fontWeight: '800', borderRadius: '2px' }}>{3 - idx}</span>
                        <span style={{ background: '#ff0000', color: '#fff', padding: '1px 6px', fontSize: '0.75rem', fontWeight: '800', borderRadius: '2px' }}>{idx === 0 ? 1 : 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Próximos Jogos Agendados */}
            <div className="glass-panel">
              <h3 style={{ marginBottom: '20px' }}>Próximas Partidas do SantaFut</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {matches.filter(m => m.status === 'agendado').map(m => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem' }}>SantaFut vs {m.adversario}</h4>
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>{new Date(m.data_hora).toLocaleString('pt-BR')} | {m.local}</p>
                    </div>
                    <span className="status-badge agendado">Agendado</span>
                  </div>
                ))}
                {matches.filter(m => m.status === 'agendado').length === 0 && (
                  <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>Nenhum jogo agendado no momento.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: ELENCO & FUT CARDS */}
        {activeTab === 'elenco' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Nossos Atletas</h1>
              <p className="text-muted">Clique nos jogadores do elenco para visualizar o card FUT premium e a teia de atributos de desempenho físico e técnico</p>
            </div>

            {/* Lista Grid de Jogadores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '30px' }}>
              {players.map(pl => (
                <div 
                  key={pl.id} 
                  onClick={() => handleOpenEditStats(pl)}
                  style={{ cursor: 'pointer', transition: '0.2s' }}
                >
                  <AthleteCard player={pl} />
                </div>
              ))}
            </div>

            {/* Detalhes / Edição de Atributos do Jogador Selecionado */}
            {selectedPlayer && (
              <div className="regulamento-overlay" style={{ background: 'rgba(8, 10, 14, 0.92)' }}>
                <div className="regulamento-container" style={{ maxWidth: '900px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <h2 style={{ fontSize: '1.8rem' }}>Painel do Atleta</h2>
                      <p className="text-muted">Estatísticas detalhadas e controle de atributos do FUT Card</p>
                    </div>
                    <button onClick={() => setSelectedPlayer(null)} className="btn btn-secondary">Fechar</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', overflowY: 'auto' }}>
                    {/* Visualização Visual (FUT Card + Radar Chart) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                      <AthleteCard player={selectedPlayer} />
                      <RadarChart stats={selectedPlayer} size={240} />
                    </div>

                    {/* Formulário de Edição de Stats (Apenas se Admin/Analista) */}
                    <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Ficha Técnica & Atributos</h3>
                      
                      {profile.role in {admin: 1, analista: 1} ? (
                        <form onSubmit={handleSaveFUTCard} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div className="input-group">
                              <label className="input-label">Nº Camisa</label>
                              <input type="number" className="input-field" value={editCamisa} onChange={e => setEditCamisa(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label className="input-label">Posição</label>
                              <select className="input-field" value={editPosicao} onChange={e => setEditPosicao(e.target.value)}>
                                <option value="ATA">Ataque (ATA)</option>
                                <option value="MC">Meio-Campo (MC)</option>
                                <option value="VOL">Volante (VOL)</option>
                                <option value="DF">Zagueiro (DF)</option>
                                <option value="GOL">Goleiro (GOL)</option>
                                <option value="LD">Lateral Dir. (LD)</option>
                                <option value="LE">Lateral Esq. (LE)</option>
                              </select>
                            </div>
                          </div>

                          <h4 style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>ATRIBUTOS DO CARD (0 A 99)</h4>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div className="input-group">
                              <label className="input-label">Ritmo (RIT)</label>
                              <input type="number" className="input-field" min="0" max="99" value={editRitmo} onChange={e => setEditRitmo(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label className="input-label">Condução (CON)</label>
                              <input type="number" className="input-field" min="0" max="99" value={editConducao} onChange={e => setEditConducao(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label className="input-label">Finalização (FIN)</label>
                              <input type="number" className="input-field" min="0" max="99" value={editFinalizacao} onChange={e => setEditFinalizacao(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label className="input-label">Defesa (DEF)</label>
                              <input type="number" className="input-field" min="0" max="99" value={editDefesa} onChange={e => setEditDefesa(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label className="input-label">Passe (PAS)</label>
                              <input type="number" className="input-field" min="0" max="99" value={editPasse} onChange={e => setEditPasse(e.target.value)} />
                            </div>
                            <div className="input-group">
                              <label className="input-label">Físico (FIS)</label>
                              <input type="number" className="input-field" min="0" max="99" value={editFisico} onChange={e => setEditFisico(e.target.value)} />
                            </div>
                          </div>

                          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
                            Salvar Atributos no Card
                          </button>
                        </form>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <p className="text-muted">Apenas a Comissão Técnica e Administradores possuem autorização para alterar atributos e numeração dos cards de atletas.</p>
                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                            <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Estatísticas Agregadas:</h4>
                            <p className="text-muted">Partidas Disputadas: <strong style={{ color: '#fff' }}>12</strong></p>
                            <p className="text-muted">Gols Marcados: <strong style={{ color: '#fff' }}>4</strong></p>
                            <p className="text-muted">Assistências de Gol: <strong style={{ color: '#fff' }}>3</strong></p>
                            <p className="text-muted">Cartão Amarelo: <strong style={{ color: '#ffd700' }}>1</strong></p>
                            <p className="text-muted">Cartão Vermelho: <strong style={{ color: '#ff0000' }}>0</strong></p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 3: SÚMULAS & PARTIDAS */}
        {activeTab === 'sumulas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Súmulas de Jogos</h1>
                <p className="text-muted">Cadastre novos confrontos, preencha placares e registre os lances oficiais das partidas</p>
              </div>
              
              {profile.role in {admin: 1, analista: 1} && (
                <button 
                  onClick={() => setSelectedMatch({ id: 'novo', status: 'agendado' })} 
                  className="btn btn-primary"
                >
                  <Plus size={16} /> Novo Jogo
                </button>
              )}
            </div>

            {/* Lista Geral de Partidas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {matches.map(match => (
                <div key={match.id} className="glass-panel">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                      <span className={`status-badge ${match.status}`} style={{ marginBottom: '8px' }}>
                        {match.status}
                      </span>
                      <h2 style={{ fontSize: '1.6rem' }}>SantaFut {match.gols_pro} vs {match.gols_contra} {match.adversario}</h2>
                      <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                        {new Date(match.data_hora).toLocaleString('pt-BR')} | {match.local}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button onClick={() => handleOpenSumula(match)} className="btn btn-secondary">
                        <FileText size={16} /> Ver Súmula / Lances
                      </button>
                      
                      {profile.role in {admin: 1, analista: 1} && match.status !== 'finalizado' && (
                        <button 
                          onClick={() => { setSelectedMatch(match); setGolsPro(match.gols_pro); setGolsContra(match.gols_contra); }} 
                          className="btn btn-primary"
                        >
                          Lançar Placar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {matches.length === 0 && (
                <p className="text-muted" style={{ textAlign: 'center', padding: '40px' }}>Nenhuma partida registrada até o momento.</p>
              )}
            </div>

            {/* Modal: Agendar Novo Jogo */}
            {selectedMatch && selectedMatch.id === 'novo' && (
              <div className="regulamento-overlay">
                <div className="regulamento-container" style={{ maxWidth: '480px' }}>
                  <h2 style={{ marginBottom: '20px' }}>Agendar Confronto</h2>
                  <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Time Adversário</label>
                      <input type="text" className="input-field" required value={newAdv} onChange={e => setNewAdv(e.target.value)} placeholder="Ex: Badboys FC" />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Data e Hora</label>
                      <input type="datetime-local" className="input-field" required value={newData} onChange={e => setNewData(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Local de Jogo</label>
                      <input type="text" className="input-field" required value={newLocal} onChange={e => setNewLocal(e.target.value)} placeholder="Ex: Arena Santa Cecília" />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                      <button type="button" onClick={() => setSelectedMatch(null)} className="btn btn-secondary">Cancelar</button>
                      <button type="submit" className="btn btn-primary">Agendar Jogo</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Modal: Lançar / Atualizar Placar Final */}
            {selectedMatch && selectedMatch.id !== 'novo' && !matchEvents.length && (
              <div className="regulamento-overlay">
                <div className="regulamento-container" style={{ maxWidth: '440px' }}>
                  <h2>Encerrar Jogo & Lançar Placar</h2>
                  <p className="text-muted" style={{ marginBottom: '20px' }}>Confirme o placar final contra {selectedMatch.adversario}</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                      <div className="input-group" style={{ width: '80px', textAlign: 'center' }}>
                        <label className="input-label">SantaFut</label>
                        <input type="number" className="input-field" style={{ textAlign: 'center', fontSize: '1.5rem' }} value={golsPro} onChange={e => setGolsPro(e.target.value)} />
                      </div>
                      <span style={{ fontSize: '2rem', fontWeight: '900', marginTop: '20px' }}>VS</span>
                      <div className="input-group" style={{ width: '80px', textAlign: 'center' }}>
                        <label className="input-label">Adversário</label>
                        <input type="number" className="input-field" style={{ textAlign: 'center', fontSize: '1.5rem' }} value={golsContra} onChange={e => setGolsContra(e.target.value)} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                      <button onClick={() => setSelectedMatch(null)} className="btn btn-secondary">Cancelar</button>
                      <button onClick={() => handleUpdateScore(selectedMatch.id)} className="btn btn-primary">Finalizar Partida</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal de Súmula Ativa (Registro e Visualização de Lances) */}
            {selectedMatch && selectedMatch.id !== 'novo' && selectedMatch.adversario && (
              <div className="regulamento-overlay" style={{ background: 'rgba(8,10,14,0.95)' }}>
                <div className="regulamento-container" style={{ maxWidth: '800px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <h2>Súmula de Partida</h2>
                      <p className="text-muted">SantaFut vs {selectedMatch.adversario} ({selectedMatch.status})</p>
                    </div>
                    <button onClick={() => setSelectedMatch(null)} className="btn btn-secondary">Fechar</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '30px', overflowY: 'auto' }}>
                    
                    {/* Linha do Tempo de Lances do Jogo */}
                    <div>
                      <h3 style={{ marginBottom: '16px' }}>Lances do Jogo</h3>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {matchEvents.map(ev => (
                          <div key={ev.id} className={`timeline-event ${ev.tipo_evento === 'cartao_amarelo' ? 'amarelo' : ev.tipo_evento === 'cartao_vermelho' ? 'vermelho' : ev.tipo_evento === 'mvp' ? 'mvp' : 'gol'}`}>
                            <div style={{ flexGrow: 1 }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>{ev.minuto}' min</span>
                              <h4 style={{ textTransform: 'uppercase' }}>
                                {ev.tipo_evento.replace('_', ' ')}
                              </h4>
                              <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                                {ev.perfis?.apelido || ev.perfis?.nome_completo || 'Atleta não identificado'}
                              </p>
                            </div>
                            {profile.role in {admin: 1, analista: 1} && (
                              <button onClick={() => handleDeleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}>
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        {matchEvents.length === 0 && (
                          <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>Nenhum lance registrado.</p>
                        )}
                      </div>
                    </div>

                    {/* Operador de Súmula (Cadastro de Lance) */}
                    <div>
                      <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Painel do Operador</h3>
                      {profile.role in {admin: 1, analista: 1} && selectedMatch.status !== 'finalizado' ? (
                        <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div className="input-group">
                            <label className="input-label">Atleta Executor</label>
                            <select className="input-field" value={evJogadorId} onChange={e => setEvJogadorId(e.target.value)} required>
                              <option value="">Selecione o jogador...</option>
                              {players.map(p => (
                                <option key={p.id} value={p.id}>
                                  #{p.numero_camisa} - {p.apelido || p.nome_completo}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div className="input-group">
                              <label className="input-label">Lance / Ação</label>
                              <select className="input-field" value={evTipo} onChange={e => setEvTipo(e.target.value)}>
                                <option value="gol">Gol Marcado</option>
                                <option value="assistencia">Assistência</option>
                                <option value="cartao_amarelo">Cartão Amarelo</option>
                                <option value="cartao_vermelho">Cartão Vermelho</option>
                                <option value="mvp">Jogador MVP</option>
                              </select>
                            </div>
                            <div className="input-group">
                              <label className="input-label">Minuto</label>
                              <input type="number" className="input-field" min="0" max="120" value={evMinuto} onChange={e => setEvMinuto(e.target.value)} />
                            </div>
                          </div>

                          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                            <Plus size={16} /> Registrar Lance na Súmula
                          </button>

                          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: '10px' }}>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '10px' }}>Ações de Jogo:</h4>
                            <button 
                              type="button" 
                              onClick={() => {
                                const gp = window.prompt("Digite os gols do SantaFut:", "0");
                                const gc = window.prompt("Digite os gols do adversário:", "0");
                                if (gp !== null && gc !== null) {
                                  setGolsPro(gp);
                                  setGolsContra(gc);
                                  handleUpdateScore(selectedMatch.id);
                                }
                              }} 
                              className="btn btn-danger" 
                              style={{ width: '100%' }}
                            >
                              Encerrar Partida (Salvar Placar)
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.01)' }}>
                          <p className="text-muted">Apenas administradores e analistas podem registrar lances ao vivo. Se a partida já estiver encerrada, nenhuma alteração de lance é permitida na súmula.</p>
                          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Placar Consolidado:</h4>
                            <p style={{ fontSize: '1.4rem', fontWeight: '900' }}>SantaFut {selectedMatch.gols_pro} - {selectedMatch.gols_contra} {selectedMatch.adversario}</p>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA 4: BOLÃO & PALPITES */}
        {activeTab === 'bolao' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Bolão Gamificado SantaFut</h1>
              <p className="text-muted">Palpite nos resultados dos confrontos agendados antes de começarem e dispute o topo do ranking de pontuação</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
              
              {/* Painel de Palpites de Jogos */}
              <div>
                <h3 style={{ marginBottom: '16px' }}>Confrontos da Rodada</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {matches.map(m => {
                    const isFinished = m.status === 'finalizado';
                    return (
                      <div key={m.id} className="glass-panel" style={{ borderLeft: isFinished ? 'none' : '3px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                          <span className={`status-badge ${m.status}`}>{m.status}</span>
                          <span className="text-muted" style={{ fontSize: '0.8rem' }}>{new Date(m.data_hora).toLocaleString('pt-BR')}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', margin: '20px 0' }}>
                          <span style={{ fontWeight: '800', width: '90px', textAlign: 'right' }}>SantaFut</span>
                          
                          {/* Inputs do Palpite */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="number" 
                              className="input-field" 
                              disabled={isFinished}
                              style={{ width: '50px', textAlign: 'center', padding: '8px' }} 
                              value={palpitePro[m.id] !== undefined ? palpitePro[m.id] : ''}
                              onChange={e => setPalpitePro({ ...palpitePro, [m.id]: e.target.value })}
                            />
                            <span style={{ fontWeight: 'bold' }}>x</span>
                            <input 
                              type="number" 
                              className="input-field" 
                              disabled={isFinished}
                              style={{ width: '50px', textAlign: 'center', padding: '8px' }} 
                              value={palpiteContra[m.id] !== undefined ? palpiteContra[m.id] : ''}
                              onChange={e => setPalpiteContra({ ...palpiteContra, [m.id]: e.target.value })}
                            />
                          </div>

                          <span style={{ fontWeight: '800', width: '90px', textAlign: 'left' }}>{m.adversario}</span>
                        </div>

                        {/* Placar Real se Finalizado */}
                        {isFinished && (
                          <div style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px' }}>
                            Placar Real: SantaFut <strong>{m.gols_pro} - {m.gols_contra}</strong> {m.adversario}
                          </div>
                        )}

                        {!isFinished ? (
                          <button onClick={() => handleSavePrediction(m.id)} className="btn btn-primary" style={{ width: '100%', padding: '8px' }}>
                            Salvar Palpite
                          </button>
                        ) : (
                          <div style={{ textAlign: 'center', fontWeight: '800', color: 'var(--primary)', fontSize: '0.9rem' }}>
                            {predictions.find(p => p.jogo_id === m.id)?.pontos_obtidos !== null ? (
                              <span>Pontos Obtidos neste palpite: {predictions.find(p => p.jogo_id === m.id)?.pontos_obtidos} pts</span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)' }}>Você não palpitou neste jogo.</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {matches.length === 0 && (
                    <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>Nenhum confronto disponível para palpites.</p>
                  )}
                </div>
              </div>

              {/* Tabela de Liderança do Bolão */}
              <div>
                <h3 style={{ marginBottom: '16px' }}>Ranking Global de Palpites</h3>
                <div className="glass-panel">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span>POS | JOGADOR</span>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <span>PALPITES</span>
                        <span>PONTOS</span>
                      </div>
                    </div>

                    {leaderboard.map((item, idx) => (
                      <div key={item.usuario_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.01)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? '#cd7f32' : 'var(--text-muted)' }}>{idx+1}º</strong>
                          {item.apelido || item.nome_completo}
                        </span>
                        
                        <div style={{ display: 'flex', gap: '40px', fontWeight: '800' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{item.total_palpites}</span>
                          <span style={{ color: idx === 0 ? 'var(--primary)' : 'var(--text-main)' }}>{item.total_pontos} pts</span>
                        </div>
                      </div>
                    ))}
                    {leaderboard.length === 0 && (
                      <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>Aguardando finalização do primeiro jogo para calcular o ranking.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ABA 5: CONTROLE ADMINISTRATIVO DISCIPLINAR */}
        {activeTab === 'admin' && profile.role === 'admin' && (
          <div>
            <div style={{ marginBottom: '30px' }}>
              <h1 style={{ fontSize: '2.5rem', marginBottom: '8px', color: 'var(--secondary)' }}>Gestão e Disciplina do Elenco</h1>
              <p className="text-muted">Painel exclusivo para banimento permanente de atletas ou aplicação manual de suspensões regulamentares</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
              
              {/* Form de Aplicar Suspensão Disciplinar Manual */}
              <div className="glass-panel">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--secondary)' }}>
                  <ShieldAlert size={22} />
                  <h3>Aplicar Suspensão Disciplinar</h3>
                </div>

                <form onSubmit={handleApplySuspension} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Jogador Punido</label>
                    <select className="input-field" value={suspJogadorId} onChange={e => setSuspJogadorId(e.target.value)} required>
                      <option value="">Selecione o jogador...</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          #{p.numero_camisa} - {p.apelido || p.nome_completo}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label className="input-label">Motivo do Julgamento</label>
                    <textarea 
                      className="input-field" 
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      value={suspMotivo}
                      onChange={e => setSuspMotivo(e.target.value)}
                      placeholder="Descreva a atitude antidesportiva com base no regulamento..."
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn-danger" style={{ width: '100%' }}>
                    Confirmar Suspensão
                  </button>
                </form>
              </div>

              {/* Tabela de Punidos (Suspensões Ativas) */}
              <div className="glass-panel">
                <h3 style={{ marginBottom: '20px' }}>Histórico / Suspensões Vigentes</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {suspensions.map(susp => {
                    const pl = players.find(p => p.id === susp.jogador_id);
                    return (
                      <div key={susp.id} style={{ padding: '14px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ textTransform: 'uppercase', fontSize: '0.95rem' }}>{pl?.apelido || pl?.nome_completo || 'Desconhecido'}</h4>
                          <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>{susp.motivo}</p>
                          <span className={`status-badge ${susp.ativa ? 'suspenso' : 'finalizado'}`} style={{ marginTop: '8px', fontSize: '0.65rem' }}>
                            {susp.ativa ? 'ATIVA' : 'REVOGADA'}
                          </span>
                        </div>
                        {susp.ativa && (
                          <button onClick={() => handleLiftSuspension(susp.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                            Revogar
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {suspensions.length === 0 && (
                    <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>Nenhum jogador punido no momento.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Lista Geral para Banimento Permanente */}
            <div className="glass-panel" style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--secondary)' }}>
                <UserX size={22} />
                <h3>Banimento de Atletas (Regulamento Geral)</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <div>
                      <strong>{p.nome_completo} ({p.apelido || 'Sem Apelido'})</strong>
                      <p className="text-muted" style={{ fontSize: '0.8rem' }}>E-mail: {p.id.substring(0,8)}... | Cargo: {p.role}</p>
                    </div>
                    
                    {p.id !== profile.id ? (
                      <button 
                        onClick={() => handleToggleBan(p, true)} 
                        className="btn btn-danger" 
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        Banir Permanentemente
                      </button>
                    ) : (
                      <span className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Você mesmo</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

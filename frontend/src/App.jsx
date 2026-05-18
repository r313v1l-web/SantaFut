import React, { useState, useEffect } from 'react';
import { 
  Shield, Award, User, LogOut, Calendar, Trophy, Users, 
  Settings, CheckSquare, Plus, Trash2, ShieldAlert, 
  TrendingUp, RotateCw, FileText, CheckCircle2, UserX
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
  const [times, setTimes] = useState([]);
  const [confirmacoes, setConfirmacoes] = useState({});

  // Estados de modais e inputs de formulário
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [matchEvents, setMatchEvents] = useState([]);

  // Estados do Calendário Interativo e Súmula Ao Vivo
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [activeLiveMatch, setActiveLiveMatch] = useState(null);
  const [liveMinute, setLiveMinute] = useState(0);

  // Inputs para novos times
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamEscudo, setNewTeamEscudo] = useState('');

  // Inputs para cadastrar perfil manual
  const [manNome, setManNome] = useState('');
  const [manApelido, setManApelido] = useState('');
  const [manRole, setManRole] = useState('jogador');
  const [manTimeId, setManTimeId] = useState('');
  
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
  const [newTimeCasaId, setNewTimeCasaId] = useState('');
  const [newTimeForaId, setNewTimeForaId] = useState('');
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
    if (profile && (profile.role === 'pendente' || profile.aceitou_regulamento)) {
      carregarDadosTab(activeTab);
    }
  }, [activeTab, profile]);

  // Se o perfil for recém-carregado e for 'pendente', redireciona para a aba de partidas / calendário
  useEffect(() => {
    if (profile && profile.role === 'pendente') {
      setActiveTab('calendario');
    }
  }, [profile]);

  // Hook do Cronômetro Ticking em Tempo Real
  useEffect(() => {
    let interval = null;
    if (activeLiveMatch && activeLiveMatch.status === 'em_andamento' && activeLiveMatch.inicio_cronometro) {
      const calculateMinute = () => {
        const diffMs = new Date() - new Date(activeLiveMatch.inicio_cronometro);
        const mins = Math.floor(diffMs / 60000);
        setLiveMinute(Math.min(120, Math.max(0, mins)));
      };
      calculateMinute();
      interval = setInterval(calculateMinute, 5000); // Atualiza a cada 5s para máxima precisão
    } else {
      setLiveMinute(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeLiveMatch]);

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
    // Carrega a lista de times de forma global para mapeamento
    api.listTeams().then(setTimes).catch(console.error);

    if (tab === 'mural') {
      api.listPlayers().then(setPlayers);
      api.listMatches().then(m => {
        setMatches(m);
        // Carrega confirmações dos jogos agendados
        m.filter(x => x.status === 'agendado').forEach(jogo => {
          api.listConfirmations(jogo.id).then(c => {
            setConfirmacoes(prev => ({ ...prev, [jogo.id]: c }));
          }).catch(console.error);
        });
      });
    } else if (tab === 'elenco' || tab === 'treinador') {
      api.listPlayers().then(setPlayers);
    } else if (tab === 'calendario') {
      api.listMatches().then(m => {
        setMatches(m);
        m.filter(x => x.status === 'agendado').forEach(jogo => {
          api.listConfirmations(jogo.id).then(c => {
            setConfirmacoes(prev => ({ ...prev, [jogo.id]: c }));
          }).catch(console.error);
        });
      });
      api.listPlayers().then(setPlayers);
    } else if (tab === 'bolao') {
      api.listMatches().then(m => {
        setMatches(m);
        m.filter(x => x.status === 'agendado').forEach(jogo => {
          api.listConfirmations(jogo.id).then(c => {
            setConfirmacoes(prev => ({ ...prev, [jogo.id]: c }));
          }).catch(console.error);
        });
      });
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
      api.listAllProfiles().then(setPlayers); // Admin visualiza todos os usuários (incluindo pendentes)
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
    if (!newTimeCasaId || !newTimeForaId) {
      alert("Selecione os dois times do confronto!");
      return;
    }
    if (newTimeCasaId === newTimeForaId) {
      alert("Os times de casa e de fora não podem ser iguais!");
      return;
    }
    try {
      await api.createMatch({
        time_casa_id: newTimeCasaId,
        time_fora_id: newTimeForaId,
        data_hora: new Date(newData).toISOString(),
        local: newLocal
      });
      alert("Partida agendada com sucesso!");
      setNewTimeCasaId('');
      setNewTimeForaId('');
      setNewData('');
      setNewLocal('');
      setSelectedMatch(null);
      carregarDadosTab('calendario');
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
      setActiveLiveMatch(null);
      carregarDadosTab('calendario');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleOpenMatchDetails = async (match) => {
    setSelectedMatch(match);
    setGolsPro(match.gols_pro || 0);
    setGolsContra(match.gols_contra || 0);
    try {
      const confs = await api.listConfirmations(match.id);
      setConfirmacoes(prev => ({ ...prev, [match.id]: confs }));
      const evs = await api.listMatchEvents(match.id);
      setMatchEvents(evs);
    } catch (err) {
      console.error("Erro ao carregar detalhes do jogo:", err);
    }
  };

  const handleStartLiveMatch = async (match) => {
    if (!window.confirm("Deseja dar o pontapé inicial e ligar o cronômetro oficial desta partida?")) return;
    try {
      const updated = await api.startMatch(match.id);
      setActiveLiveMatch(updated);
      setSelectedMatch(null); // Fecha o modal de detalhes para focar na súmula ao vivo
      setGolsPro(0);
      setGolsContra(0);
      // Atualiza o estado local do jogo
      setMatches(prev => prev.map(m => m.id === updated.id ? updated : m));
      const evs = await api.listMatchEvents(updated.id);
      setMatchEvents(evs);
      alert("Cronômetro SantaFut iniciado! Súmula premium ativa.");
    } catch (err) {
      alert("Erro ao iniciar partida: " + err.message);
    }
  };

  const handleAddLiveEvent = async (timeId, jogadorId, tipo, minutoVal) => {
    if (!jogadorId) {
      alert("Selecione um jogador!");
      return;
    }
    try {
      await api.addMatchEvent(activeLiveMatch.id, {
        jogo_id: activeLiveMatch.id,
        jogador_id: jogadorId,
        time_id: timeId || null,
        tipo_evento: tipo,
        minuto: parseInt(minutoVal)
      });
      
      // Recarrega eventos
      const evs = await api.listMatchEvents(activeLiveMatch.id);
      setMatchEvents(evs);
      
      // Atualiza o placar ao vivo no componente local de forma otimista
      // (o backend já faz o cálculo em tempo real e atualiza os gols)
      const updatedMatch = await api.getMatchDetails(activeLiveMatch.id);
      setActiveLiveMatch(updatedMatch);
      setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteLiveEvent = async (eventId) => {
    if (!window.confirm("Deseja remover este lance da súmula?")) return;
    try {
      await api.deleteMatchEvent(eventId);
      const targetMatchId = activeLiveMatch?.id || selectedMatch?.id;
      const evs = await api.listMatchEvents(targetMatchId);
      setMatchEvents(evs);
      
      // Sincroniza o placar
      const updatedMatch = await api.getMatchDetails(targetMatchId);
      if (activeLiveMatch) {
        setActiveLiveMatch(updatedMatch);
      }
      if (selectedMatch) {
        setSelectedMatch(updatedMatch);
      }
      setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    } catch (err) {
      alert(err.message);
    }
  };

  // Operações de Súmula (Lances do Jogo) - Retrocompatibilidade
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

  const handleConfirmAttendance = async (matchId) => {
    try {
      await api.confirmAttendance(matchId);
      const data = await api.listConfirmations(matchId);
      setConfirmacoes(prev => ({ ...prev, [matchId]: data }));
      alert("Presença confirmada!");
    } catch (err) {
      alert("Erro ao confirmar presença: " + err.message);
    }
  };

  const handleCancelAttendance = async (matchId) => {
    try {
      await api.cancelAttendance(matchId);
      const data = await api.listConfirmations(matchId);
      setConfirmacoes(prev => ({ ...prev, [matchId]: data }));
      alert("Presença cancelada.");
    } catch (err) {
      alert("Erro ao cancelar presença: " + err.message);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName) {
      alert("Preencha o nome do time!");
      return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn?.textContent;
    if (submitBtn) submitBtn.textContent = '⏳ Enviando...';
    
    try {
      let escudoFinalUrl = newTeamEscudo || null;
      
      // Se um arquivo de imagem foi selecionado, faz upload para o Supabase Storage
      const fileInput = e.target.querySelector('input[type="file"]');
      if (fileInput && fileInput.files.length > 0) {
        try {
          escudoFinalUrl = await api.uploadImage(fileInput.files[0], 'avatars', 'escudos');
        } catch (uploadErr) {
          alert("Erro no upload da imagem: " + uploadErr.message);
          if (submitBtn) submitBtn.textContent = originalText;
          return;
        }
      }
      
      await api.createTeam({
        nome: newTeamName,
        escudo_url: escudoFinalUrl
      });
      alert("Time cadastrado com sucesso!");
      setNewTeamName('');
      setNewTeamEscudo('');
      if (fileInput) fileInput.value = '';
      carregarDadosTab('admin');
    } catch (err) {
      alert("Erro ao cadastrar time no servidor: " + err.message);
    } finally {
      if (submitBtn) submitBtn.textContent = originalText;
    }
  };

  const handleDeleteTeam = async (id) => {
    if (!window.confirm("Deseja deletar este time? Todos os jogadores perderão este vínculo.")) return;
    try {
      await api.deleteTeam(id);
      alert("Time removido!");
      carregarDadosTab('admin');
    } catch (err) {
      alert("Erro ao deletar time: " + err.message);
    }
  };

  const handleCreateProfileFromScratch = async (e) => {
    e.preventDefault();
    if (!manNome) {
      alert("Preencha o nome completo!");
      return;
    }
    try {
      await api.createProfileFromScratch({
        nome_completo: manNome,
        apelido: manApelido || null,
        role: manRole,
        time_id: manTimeId || null
      });
      alert("Perfil manual cadastrado com sucesso!");
      setManNome('');
      setManApelido('');
      setManRole('jogador');
      setManTimeId('');
      carregarDadosTab('admin');
    } catch (err) {
      alert("Erro ao cadastrar perfil: " + err.message);
    }
  };

  const handleUpdateProfileByAdmin = async (userId, roleVal, timeVal) => {
    try {
      await api.updateProfileByAdmin(userId, {
        role: roleVal,
        time_id: timeVal || null
      });
      alert("Vínculo e permissão do usuário atualizados com sucesso!");
      carregarDadosTab('admin');
    } catch (err) {
      alert("Erro ao atualizar perfil: " + err.message);
    }
  };

  const handleDeleteProfile = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este perfil?")) return;
    try {
      await api.deleteProfile(id);
      alert("Perfil deletado com sucesso!");
      carregarDadosTab('admin');
    } catch (err) {
      alert("Erro ao deletar perfil: " + err.message);
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
        <RotateCw className="animate-spin text-primary" size={50} style={{ color: '#39ff14' }} />
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
  // TELA DE ERRO DE CONEXÃO (API OFFLINE)
  // ==========================================
  if (session && !profile) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: '450px', textAlign: 'center' }}>
          <ShieldAlert size={50} style={{ color: 'var(--secondary)', margin: '0 auto 20px auto' }} />
          <h2 className="text-gradient-secondary" style={{ fontSize: '1.8rem', marginBottom: '12px' }}>API SantaFut Offline</h2>
          <p className="text-muted" style={{ fontSize: '0.95rem', marginBottom: '24px', lineHeight: '1.6' }}>
            Não conseguimos nos conectar ao servidor backend do SantaFut. 
            <br />
            Por favor, certifique-se de que a API (FastAPI) está rodando localmente na porta 8000 ou faça o deploy na nuvem.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={fetchProfile} className="btn btn-primary" style={{ width: '100%' }}>
              Tentar Conectar Novamente
            </button>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
              Desconectar Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // TELA 2: BARREIRA DO REGULAMENTO (MURAL DO BADA)
  // ==========================================
  if (profile && profile.role !== 'pendente' && !profile.aceitou_regulamento) {
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
          {profile.role !== 'pendente' && (
            <button onClick={() => setActiveTab('mural')} className={`nav-btn ${activeTab === 'mural' ? 'active' : ''}`}>
              <Trophy size={18} /> Classificação & Mural
            </button>
          )}
          {profile.role !== 'pendente' && (
            <button onClick={() => setActiveTab('elenco')} className={`nav-btn ${activeTab === 'elenco' ? 'active' : ''}`}>
              <Users size={18} /> Elenco & FUT Cards
            </button>
          )}
          {profile.role === 'treinador' && (
            <button onClick={() => setActiveTab('treinador')} className={`nav-btn ${activeTab === 'treinador' ? 'active' : ''}`}>
              <Users size={18} /> Meus Jogadores (Treinador)
            </button>
          )}
          <button onClick={() => setActiveTab('calendario')} className={`nav-btn ${activeTab === 'calendario' ? 'active' : ''}`}>
            <Calendar size={18} /> Calendário de Jogos
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
        {profile.role === 'pendente' && (
          <div className="glass-panel" style={{ borderLeft: '4px solid var(--secondary)', background: 'rgba(255, 0, 127, 0.05)', marginBottom: '30px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldAlert size={28} style={{ color: 'var(--secondary)' }} />
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Cadastro Pendente de Atribuição</h3>
                <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                  Olá, <strong>{profile.nome_completo}</strong>! Seu cadastro foi recebido com sucesso. 
                  Um administrador irá analisar seu perfil e atribuir seu time e cargo em breve.
                  <br />
                  Enquanto isso, você já pode <strong>ver o calendário de jogos, resultados anteriores e enviar palpites no Bolão</strong>! ⚽🏆
                </p>
              </div>
            </div>
          </div>
        )}

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
                      
                      {(profile.role === 'admin' || profile.role === 'analista' || (profile.role === 'treinador' && selectedPlayer.time_id === profile.time_id)) ? (
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

        {/* ABA TREINADOR: MEUS JOGADORES */}
        {activeTab === 'treinador' && (
          <div>
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Meus Jogadores</h1>
                <p className="text-muted">
                  Treinador do time: <strong style={{ color: 'var(--primary)' }}>
                    {times.find(t => t.id === profile.time_id)?.nome || 'Sem Time Atribuído'}
                  </strong>
                </p>
              </div>
              {times.find(t => t.id === profile.time_id)?.escudo_url && (
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#222', border: '1px solid var(--border-color)', padding: '4px' }}>
                  <img src={times.find(t => t.id === profile.time_id)?.escudo_url} alt="Escudo Time" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '30px' }}>
              {players.filter(p => p.time_id === profile.time_id && p.role === 'jogador').map(pl => (
                <div 
                  key={pl.id} 
                  onClick={() => handleOpenEditStats(pl)}
                  style={{ cursor: 'pointer', transition: '0.2s' }}
                >
                  <AthleteCard player={pl} />
                </div>
              ))}
              {players.filter(p => p.time_id === profile.time_id && p.role === 'jogador').length === 0 && (
                <div className="glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                  <p className="text-muted">Nenhum jogador atribuído ao seu time no momento. Solicite ao administrador a vinculação dos atletas.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 3: CALENDÁRIO INTERATIVO & PARTIDAS */}
        {activeTab === 'calendario' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
              <div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '8px' }}>Calendário de Partidas</h1>
                <p className="text-muted">Acompanhe os próximos jogos agendados, confirme presença ou opere partidas ao vivo</p>
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

            {/* Calendário Mensal Interativo */}
            <div className="calendar-container">
              <div className="calendar-header">
                <button 
                  onClick={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear(prev => prev - 1);
                    } else {
                      setCurrentMonth(prev => prev - 1);
                    }
                  }} 
                  className="calendar-nav-btn"
                >
                  ◀ Mês Anterior
                </button>
                <h2 style={{ fontSize: '1.6rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][currentMonth]} {currentYear}
                </h2>
                <button 
                  onClick={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear(prev => prev + 1);
                    } else {
                      setCurrentMonth(prev => prev + 1);
                    }
                  }} 
                  className="calendar-nav-btn"
                >
                  Próximo Mês ▶
                </button>
              </div>

              <div className="calendar-weekdays">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {(() => {
                  const primeiroDiaIndex = new Date(currentYear, currentMonth, 1).getDay();
                  const totalDiasMes = new Date(currentYear, currentMonth + 1, 0).getDate();
                  const cells = [];
                  
                  // Slots vazios
                  for (let i = 0; i < primeiroDiaIndex; i++) {
                    cells.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
                  }
                  
                  // Dias do mês
                  for (let dia = 1; dia <= totalDiasMes; dia++) {
                    const dataStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
                    const partidasDia = matches.filter(m => m.data_hora.split('T')[0] === dataStr);
                    
                    cells.push(
                      <div 
                        key={`day-${dia}`} 
                        className={`calendar-day ${partidasDia.length > 0 ? 'has-match' : ''}`}
                        onClick={() => {
                          if (partidasDia.length > 0) {
                            handleOpenMatchDetails(partidasDia[0]);
                          }
                        }}
                      >
                        <span className="day-number">{dia}</span>
                        <div className="match-badges">
                          {partidasDia.map(partida => {
                            const timeC = partida.time_casa?.nome || 'SantaFut';
                            const timeF = partida.time_fora?.nome || partida.adversario || 'Adversário';
                            const isFinished = partida.status === 'finalizado';
                            const isLive = partida.status === 'em_andamento';
                            
                            return (
                              <div 
                                key={partida.id} 
                                className={`match-badge-pill ${partida.status}`}
                                title={`${timeC} vs ${timeF}`}
                              >
                                {isLive ? (
                                  <span className="live-pulse">🔴</span>
                                ) : isFinished ? (
                                  <span>🏆</span>
                                ) : (
                                  <span>⚽</span>
                                )}
                                <span className="match-pill-text" style={{ fontSize: '0.65rem', overflow: 'hidden' }}>
                                  {isFinished ? `${partida.gols_pro}x${partida.gols_contra}` : `${timeC.slice(0,5)}x${timeF.slice(0,5)}`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return cells;
                })()}
              </div>
            </div>

            {/* Listagem de Próximos Confrontos e Súmulas Abaixo */}
            <div className="glass-panel" style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>Lista Geral de Partidas Cadastradas</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {matches.map(match => {
                  const timeC = match.time_casa?.nome || 'SantaFut';
                  const timeF = match.time_fora?.nome || match.adversario || 'Adversário';
                  const shieldC = match.time_casa?.escudo_url || '';
                  const shieldF = match.time_fora?.escudo_url || '';
                  const isFinished = match.status === 'finalizado';
                  const isLive = match.status === 'em_andamento';

                  return (
                    <div 
                      key={match.id} 
                      className="glass-panel-interactive" 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '20px', 
                        background: 'rgba(255,255,255,0.01)', 
                        borderRadius: 'var(--radius-sm)', 
                        border: isLive ? '1px solid var(--secondary)' : '1px solid var(--border-color)',
                        flexWrap: 'wrap',
                        gap: '16px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        {/* Escudo Casa */}
                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '4px' }}>
                          {shieldC ? <img src={shieldC} alt="Casa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Award size={20} className="text-muted" />}
                        </div>
                        
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className={`status-badge ${match.status}`}>
                              {isLive ? '🔴 AO VIVO' : match.status}
                            </span>
                            <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                              {new Date(match.data_hora).toLocaleString('pt-BR')} | {match.local}
                            </span>
                          </div>
                          
                          <h3 style={{ fontSize: '1.4rem', marginTop: '4px', color: '#fff' }}>
                            {timeC} {isFinished || isLive ? match.gols_pro : ''} vs {isFinished || isLive ? match.gols_contra : ''} {timeF}
                          </h3>
                        </div>

                        {/* Escudo Fora */}
                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '4px' }}>
                          {shieldF ? <img src={shieldF} alt="Fora" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Award size={20} className="text-muted" />}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        {match.status === 'agendado' && profile.role !== 'pendente' && (
                          confirmacoes[match.id]?.some(c => c.jogador_id === profile.id) ? (
                            <button onClick={() => handleCancelAttendance(match.id)} className="btn btn-danger" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                              Cancelar Presença
                            </button>
                          ) : (
                            <button onClick={() => handleConfirmAttendance(match.id)} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                              Confirmar Presença
                            </button>
                          )
                        )}
                        <button onClick={() => handleOpenMatchDetails(match)} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                          <FileText size={16} /> Ver Detalhes
                        </button>
                        
                        {profile.role in {admin: 1, analista: 1} && isLive && (
                          <button 
                            onClick={() => {
                              setActiveLiveMatch(match);
                              setGolsPro(match.gols_pro);
                              setGolsContra(match.gols_contra);
                              api.listMatchEvents(match.id).then(setMatchEvents);
                            }} 
                            className="btn btn-danger"
                            style={{ padding: '8px 16px', fontSize: '0.85rem', animation: 'pulse-border 1.5s infinite alternate' }}
                          >
                            Operar Súmula Ao Vivo
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {matches.length === 0 && (
                  <p className="text-muted" style={{ textAlign: 'center', padding: '20px' }}>Nenhum jogo registrado até o momento.</p>
                )}
              </div>
            </div>

            {/* Modal: Agendar Novo Jogo */}
            {selectedMatch && selectedMatch.id === 'novo' && (
              <div className="regulamento-overlay">
                <div className="regulamento-container" style={{ maxWidth: '520px' }}>
                  <h2 style={{ marginBottom: '20px' }}>Agendar Confronto SantaFut</h2>
                  <form onSubmit={handleCreateMatch} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div className="input-group">
                      <label className="input-label">Time da Casa (Mandante)</label>
                      <select className="input-field" required value={newTimeCasaId} onChange={e => setNewTimeCasaId(e.target.value)}>
                        <option value="">Selecione o Time Casa...</option>
                        {times.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Time de Fora (Visitante)</label>
                      <select className="input-field" required value={newTimeForaId} onChange={e => setNewTimeForaId(e.target.value)}>
                        <option value="">Selecione o Time Fora...</option>
                        {times.map(t => (
                          <option key={t.id} value={t.id}>{t.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Data e Hora do Confronto</label>
                      <input type="datetime-local" className="input-field" required value={newData} onChange={e => setNewData(e.target.value)} />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Local / Estádio</label>
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

            {/* Modal: Detalhes do Jogo (RSVP, Súmulas, Linha do tempo, Início do Cronômetro) */}
            {selectedMatch && selectedMatch.id !== 'novo' && (
              <div className="regulamento-overlay" style={{ background: 'rgba(8,10,14,0.95)' }}>
                <div className="regulamento-container" style={{ maxWidth: '850px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }}>
                    <div>
                      <h2>Confronto SantaFut</h2>
                      <p className="text-muted">{selectedMatch.local} | {new Date(selectedMatch.data_hora).toLocaleString('pt-BR')}</p>
                    </div>
                    <button onClick={() => setSelectedMatch(null)} className="btn btn-secondary">Fechar Detalhes</button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px', overflowY: 'auto' }}>
                    
                    {/* Painel Esquerdo: Placar e Lances */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '48px', height: '48px', margin: '0 auto 8px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', borderRadius: '8px' }}>
                            {selectedMatch.time_casa?.escudo_url ? <img src={selectedMatch.time_casa?.escudo_url} alt="Casa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Award size={24} />}
                          </div>
                          <strong style={{ display: 'block', fontSize: '0.9rem' }}>{selectedMatch.time_casa?.nome || 'SantaFut'}</strong>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <span className={`status-badge ${selectedMatch.status}`} style={{ fontSize: '0.65rem', marginBottom: '4px' }}>{selectedMatch.status}</span>
                          <span style={{ fontSize: '2rem', fontWeight: '900' }}>
                            {selectedMatch.status === 'agendado' ? 'VS' : `${selectedMatch.gols_pro} - ${selectedMatch.gols_contra}`}
                          </span>
                        </div>

                        <div style={{ textAlign: 'center' }}>
                          <div style={{ width: '48px', height: '48px', margin: '0 auto 8px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', borderRadius: '8px' }}>
                            {selectedMatch.time_fora?.escudo_url ? <img src={selectedMatch.time_fora?.escudo_url} alt="Fora" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <Award size={24} />}
                          </div>
                          <strong style={{ display: 'block', fontSize: '0.9rem' }}>{selectedMatch.time_fora?.nome || selectedMatch.adversario || 'Adversário'}</strong>
                        </div>
                      </div>

                      {/* Timeline de Lances se o jogo já ocorreu ou está rolando */}
                      {selectedMatch.status !== 'agendado' ? (
                        <div>
                          <h3 style={{ marginBottom: '16px', color: 'var(--primary)' }}>Linha do Tempo (Lances)</h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '300px', overflowY: 'auto' }}>
                            {matchEvents.map(ev => (
                              <div key={ev.id} className={`timeline-event ${ev.tipo_evento === 'cartao_amarelo' ? 'amarelo' : ev.tipo_evento === 'cartao_vermelho' ? 'vermelho' : ev.tipo_evento === 'mvp' ? 'mvp' : 'gol'}`}>
                                <div style={{ flexGrow: 1 }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700' }}>{ev.minuto}' min</span>
                                  <h4 style={{ textTransform: 'uppercase', fontSize: '0.85rem', margin: '2px 0' }}>
                                    {ev.tipo_evento.replace('_', ' ')}
                                  </h4>
                                  <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                                    {ev.perfis?.apelido || ev.perfis?.nome_completo || 'Jogador'}
                                  </p>
                                </div>
                                {profile.role in {admin: 1, analista: 1} && (
                                  <button onClick={() => handleDeleteLiveEvent(ev.id)} style={{ background: 'none', border: 'none', color: 'var(--secondary)', cursor: 'pointer' }}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {matchEvents.length === 0 && (
                              <p className="text-muted" style={{ padding: '10px', textAlign: 'center', fontSize: '0.9rem' }}>Nenhum lance registrado ainda.</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="glass-panel" style={{ background: 'rgba(255,255,255,0.01)', textAlign: 'center', padding: '20px' }}>
                          <p className="text-muted">Aguardando início do jogo para registrar lances de gols e cartões na súmula.</p>
                          {profile.role in {admin: 1, analista: 1} && (
                            <button 
                              onClick={() => handleStartLiveMatch(selectedMatch)} 
                              className="btn btn-primary" 
                              style={{ width: '100%', marginTop: '20px' }}
                            >
                              ▶️ Iniciar Jogo (Ativar Cronômetro)
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Painel Direito: Confirmações / RSVPs */}
                    <div>
                      <h3 style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Jogadores Confirmados</span>
                        <span style={{ fontSize: '0.9rem', color: 'var(--primary)', background: 'rgba(57, 255, 20, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                          {confirmacoes[selectedMatch.id]?.length || 0} Atletas
                        </span>
                      </h3>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
                        {confirmacoes[selectedMatch.id]?.map(conf => (
                          <div 
                            key={conf.id} 
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between', 
                              background: 'rgba(255,255,255,0.02)', 
                              border: '1px solid var(--border-color)', 
                              padding: '10px 14px', 
                              borderRadius: '8px' 
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                                <img src={conf.perfis?.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${conf.perfis?.apelido}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div>
                                <strong style={{ color: '#fff', fontSize: '0.9rem' }}>{conf.perfis?.apelido || conf.perfis?.nome_completo.split(' ')[0]}</strong>
                                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary)' }}>
                                  {times.find(t => t.id === conf.perfis?.time_id)?.nome || 'Sem Time'}
                                </span>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)' }}>
                              #{conf.perfis?.numero_camisa || 'S/N'}
                            </span>
                          </div>
                        ))}
                        {(!confirmacoes[selectedMatch.id] || confirmacoes[selectedMatch.id].length === 0) && (
                          <p className="text-muted" style={{ padding: '20px', textAlign: 'center', fontSize: '0.9rem', fontStyle: 'italic' }}>Nenhuma confirmação de atleta para este jogo.</p>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PAINEL PREMIUM DE SÚMULA AO VIVO COMPLETO (OVERLAY FULL SCREEN) */}
        {activeLiveMatch && (
          <div className="live-sumula-overlay">
            <div className="live-sumula-container">
              
              {/* Header com Cronômetro, Placar e Botão de Fechar */}
              <div className="live-sumula-header">
                <div>
                  <h1 style={{ fontSize: '2rem', color: '#fff' }}>SÚMULA PREMIUM AO VIVO</h1>
                  <p className="text-muted">Minuto atual: <strong style={{ color: 'var(--secondary)' }}>{liveMinute}' min</strong> | Local: {activeLiveMatch.local}</p>
                </div>

                {/* Scoreboard Central */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '30px', background: 'rgba(0,0,0,0.3)', padding: '12px 30px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{activeLiveMatch.time_casa?.nome || 'SantaFut'}</h3>
                    <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff' }}>{activeLiveMatch.gols_pro}</span>
                  </div>
                  <span style={{ fontSize: '1.8rem', fontWeight: '300', color: 'var(--text-muted)' }}>VS</span>
                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--secondary)' }}>{activeLiveMatch.time_fora?.nome || activeLiveMatch.adversario}</h3>
                    <span style={{ fontSize: '2.5rem', fontWeight: '900', color: '#fff' }}>{activeLiveMatch.gols_contra}</span>
                  </div>
                </div>

                {/* Bloco do Cronômetro Oficial */}
                <div className="live-sumula-timer">
                  <span className="input-label" style={{ fontSize: '0.7rem' }}>Cronômetro Oficial</span>
                  <span className="pulse-timer live">{String(liveMinute).padStart(2, '0')}:00</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--secondary)', fontWeight: '700', marginTop: '4px', textTransform: 'uppercase' }}>🔴 AO VIVO</span>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button 
                    onClick={() => {
                      setGolsPro(activeLiveMatch.gols_pro);
                      setGolsContra(activeLiveMatch.gols_contra);
                      handleUpdateScore(activeLiveMatch.id);
                    }} 
                    className="btn btn-danger"
                    style={{ background: 'var(--secondary)', color: '#fff' }}
                  >
                    ⏹️ Encerrar Jogo & Salvar Placar
                  </button>
                  <button 
                    onClick={() => {
                      setActiveLiveMatch(null);
                      carregarDadosTab('calendario');
                    }} 
                    className="btn btn-secondary"
                  >
                    Minimizar Painel
                  </button>
                </div>
              </div>

              {/* Corpo de Lançamentos de Eventos Dividido por Time Casa vs Fora */}
              <div className="live-sumula-columns">
                
                {/* Coluna do Time Mandante (Casa) */}
                <div className="live-sumula-col casa">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ color: 'var(--primary)' }}>⚽ {activeLiveMatch.time_casa?.nome || 'SantaFut'} (Mandante)</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registrar ocorrência para o mandante</span>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const pId = e.target.jogador.value;
                      const tipo = e.target.tipo.value;
                      await handleAddLiveEvent(activeLiveMatch.time_casa_id, pId, tipo, liveMinute);
                      e.target.jogador.value = '';
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <div className="input-group">
                      <label className="input-label">Atleta Executor</label>
                      <select name="jogador" className="input-field" required>
                        <option value="">Selecione o jogador do Mandante...</option>
                        {players.filter(p => p.time_id === activeLiveMatch.time_casa_id || !p.time_id).map(p => (
                          <option key={p.id} value={p.id}>
                            #{p.numero_camisa || 'S/N'} - {p.apelido || p.nome_completo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                      <div className="input-group">
                        <label className="input-label">Ocorrência</label>
                        <select name="tipo" className="input-field" required>
                          <option value="gol">⚽ Gol Marcado</option>
                          <option value="assistencia">👟 Assistência</option>
                          <option value="cartao_amarelo">🟨 Cartão Amarelo</option>
                          <option value="cartao_vermelho">🟥 Cartão Vermelho</option>
                          <option value="mvp">⭐ Craque do Jogo (MVP)</option>
                        </select>
                      </div>

                      <div className="input-group">
                        <label className="input-label">Minuto</label>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px', padding: '0 16px', background: 'rgba(57, 255, 20, 0.08)', border: '1px solid rgba(57, 255, 20, 0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--primary)', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '0.05em', minWidth: '70px' }}>
                          {liveMinute}'
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }}>
                      <Plus size={16} /> Registrar Evento para o Mandante
                    </button>
                  </form>
                </div>

                {/* Coluna do Time Visitante (Fora) */}
                <div className="live-sumula-col fora">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ color: 'var(--secondary)' }}>🛡️ {activeLiveMatch.time_fora?.nome || activeLiveMatch.adversario} (Visitante)</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Registrar ocorrência para o visitante</span>
                  </div>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const pId = e.target.jogador.value;
                      const tipo = e.target.tipo.value;
                      await handleAddLiveEvent(activeLiveMatch.time_fora_id, pId, tipo, liveMinute);
                      e.target.jogador.value = '';
                    }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <div className="input-group">
                      <label className="input-label">Atleta Executor</label>
                      <select name="jogador" className="input-field" required>
                        <option value="">Selecione o jogador do Visitante...</option>
                        {players.filter(p => p.time_id === activeLiveMatch.time_fora_id || !p.time_id).map(p => (
                          <option key={p.id} value={p.id}>
                            #{p.numero_camisa || 'S/N'} - {p.apelido || p.nome_completo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
                      <div className="input-group">
                        <label className="input-label">Ocorrência</label>
                        <select name="tipo" className="input-field" required>
                          <option value="gol">⚽ Gol Marcado</option>
                          <option value="assistencia">👟 Assistência</option>
                          <option value="cartao_amarelo">🟨 Cartão Amarelo</option>
                          <option value="cartao_vermelho">🟥 Cartão Vermelho</option>
                          <option value="mvp">⭐ Craque do Jogo (MVP)</option>
                        </select>
                      </div>

                      <div className="input-group">
                        <label className="input-label">Minuto</label>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '48px', padding: '0 16px', background: 'rgba(255, 0, 127, 0.08)', border: '1px solid rgba(255, 0, 127, 0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--secondary)', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '0.05em', minWidth: '70px' }}>
                          {liveMinute}'
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-danger" style={{ width: '100%', marginTop: '10px' }}>
                      <Plus size={16} /> Registrar Evento para o Visitante
                    </button>
                  </form>
                </div>

              </div>

              {/* Rodapé: Timeline em Tempo Real consolidando todos os lances de ambos os lados */}
              <div className="glass-panel" style={{ background: 'var(--bg-surface)' }}>
                <h3 style={{ marginBottom: '20px', color: 'var(--primary)' }}>Linha do Tempo Oficial da Partida</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto' }}>
                  {matchEvents.map(ev => {
                    const pl = players.find(p => p.id === ev.jogador_id);
                    const tm = times.find(t => t.id === ev.time_id);
                    return (
                      <div 
                        key={ev.id} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '12px 20px', 
                          background: 'rgba(255,255,255,0.02)', 
                          borderRadius: '8px', 
                          borderLeft: tm?.id === activeLiveMatch.time_casa_id ? '4px solid var(--primary)' : '4px solid var(--secondary)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-muted)' }}>{ev.minuto}'</span>
                          <div>
                            <strong style={{ fontSize: '1rem', color: '#fff', textTransform: 'uppercase' }}>
                              {ev.tipo_evento === 'gol' ? '⚽ GOL!' : ev.tipo_evento === 'assistencia' ? '👟 ASSISTÊNCIA' : ev.tipo_evento === 'cartao_amarelo' ? '🟨 CARTÃO AMARELO' : ev.tipo_evento === 'cartao_vermelho' ? '🟥 CARTÃO VERMELHO' : '⭐ MVP'}
                            </strong>
                            <span style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                              {pl?.apelido || pl?.nome_completo || 'Atleta'} ({tm?.nome || 'Time'})
                            </span>
                          </div>
                        </div>

                        <button onClick={() => handleDeleteLiveEvent(ev.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--secondary)' }}>
                          Remover Lance
                        </button>
                      </div>
                    );
                  })}
                  {matchEvents.length === 0 && (
                    <p className="text-muted" style={{ padding: '20px', textAlign: 'center' }}>Aguardando o primeiro lance do jogo...</p>
                  )}
                </div>
              </div>

            </div>
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

            {/* Gerenciamento de Times */}
            <div className="glass-panel" style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--primary)' }}>
                <Award size={22} />
                <h3>Gerenciar Times & Escudos</h3>
              </div>
              
              <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="input-group">
                    <label className="input-label">Nome do Time</label>
                    <input type="text" className="input-field" placeholder="Ex: SantaFut Principal" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label">📁 Upload do Escudo/Logo</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="input-field" 
                      style={{ padding: '10px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label" style={{ fontSize: '0.7rem' }}>Ou cole uma URL direta (opcional)</label>
                  <input type="text" className="input-field" placeholder="Ex: https://link.com/imagem.png" value={newTeamEscudo} onChange={e => setNewTeamEscudo(e.target.value)} style={{ padding: '10px', fontSize: '0.85rem' }} />
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px' }}>
                  Criar Time
                </button>
              </form>

              <h4 style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Times Cadastrados ({times.length})</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                {times.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '4px', overflow: 'hidden', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {t.escudo_url ? (
                          <img src={t.escudo_url} alt={t.nome} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Award size={18} className="text-muted" />
                        )}
                      </div>
                      <strong style={{ fontSize: '1rem', color: '#fff' }}>{t.nome}</strong>
                    </div>
                    <button onClick={() => handleDeleteTeam(t.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--secondary)' }}>
                      Excluir
                    </button>
                  </div>
                ))}
                {times.length === 0 && (
                  <p className="text-muted" style={{ gridColumn: '1 / -1', fontStyle: 'italic', fontSize: '0.9rem' }}>Nenhum time cadastrado no momento.</p>
                )}
              </div>
            </div>

            {/* Cadastrar Jogador do Zero */}
            <div className="glass-panel" style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--primary)' }}>
                <Plus size={22} />
                <h3>Cadastrar Jogador do Zero (Ficha Manual)</h3>
              </div>
              
              <form onSubmit={handleCreateProfileFromScratch} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                <div className="input-group">
                  <label className="input-label">Nome Completo</label>
                  <input type="text" className="input-field" placeholder="Ex: Roberto Carlos" value={manNome} onChange={e => setManNome(e.target.value)} required />
                </div>
                <div className="input-group">
                  <label className="input-label">Apelido (Para o Card)</label>
                  <input type="text" className="input-field" placeholder="Ex: Robertinho" value={manApelido} onChange={e => setManApelido(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Cargo / Role</label>
                  <select className="input-field" value={manRole} onChange={e => setManRole(e.target.value)}>
                    <option value="jogador">Jogador</option>
                    <option value="treinador">Treinador</option>
                    <option value="analista">Comissão Técnica (Analista)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Time Vinculado</label>
                  <select className="input-field" value={manTimeId} onChange={e => setManTimeId(e.target.value)}>
                    <option value="">Sem Vínculo</option>
                    {times.map(t => (
                      <option key={t.id} value={t.id}>{t.nome}</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ height: '42px', padding: '0 24px', whiteSpace: 'nowrap' }}>
                  Criar Ficha Manual
                </button>
              </form>
            </div>

            {/* Controle Geral de Perfis e Vinculação */}
            <div className="glass-panel" style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--secondary)' }}>
                <Users size={22} />
                <h3>Controle Geral de Perfis, Cargos e Times ({players.length})</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {players.map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', overflow: 'hidden', background: '#333' }}>
                          <img src={p.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${p.apelido || p.nome_completo}`} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: '#fff' }}>
                            {p.nome_completo} {p.apelido && <span style={{ color: 'var(--primary)' }}>({p.apelido})</span>}
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: p.role === 'pendente' ? 'var(--secondary)' : 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>
                            Status Atual: {p.role}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Botão de Upload de Foto do Jogador */}
                        <label 
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(57, 255, 20, 0.1)', border: '1px solid rgba(57, 255, 20, 0.2)', borderRadius: '4px', cursor: 'pointer', color: 'var(--primary)', fontWeight: '600' }}
                        >
                          📷 Foto
                          <input 
                            type="file" 
                            accept="image/*" 
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              if (!e.target.files.length) return;
                              try {
                                const url = await api.uploadImage(e.target.files[0], 'avatars', 'jogadores');
                                await api.updateProfileByAdmin(p.id, { avatar_url: url });
                                alert('Foto do jogador atualizada com sucesso!');
                                carregarDadosTab('admin');
                              } catch (err) {
                                alert('Erro ao enviar foto: ' + err.message);
                              }
                            }}
                          />
                        </label>

                        {p.id !== profile.id && (
                          <>
                            <button onClick={() => handleDeleteProfile(p.id)} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--secondary)' }}>
                              Excluir Conta
                            </button>
                            <button onClick={() => handleToggleBan(p, !p.banido)} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '0.8rem', background: p.banido ? 'rgba(57, 255, 20, 0.2)' : 'rgba(255, 0, 127, 0.2)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', color: '#fff' }}>
                              {p.banido ? 'Desbanir' : 'Banir'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '12px', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '12px' }}>
                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.75rem' }}>Cargo / Permissão</label>
                        <select 
                          id={`role-select-${p.id}`}
                          className="input-field" 
                          defaultValue={p.role}
                          style={{ padding: '6px' }}
                        >
                          <option value="pendente">Pendente (Aguardando Aprovação)</option>
                          <option value="jogador">Jogador Titular / Reserva</option>
                          <option value="treinador">Treinador Principal</option>
                          <option value="analista">Comissão Técnica (Analista)</option>
                          <option value="admin">Administrador Geral</option>
                          <option value="torcedor">Torcedor</option>
                        </select>
                      </div>

                      <div className="input-group">
                        <label className="input-label" style={{ fontSize: '0.75rem' }}>Time Vinculado</label>
                        <select 
                          id={`time-select-${p.id}`}
                          className="input-field" 
                          defaultValue={p.time_id || ''}
                          style={{ padding: '6px' }}
                        >
                          <option value="">Sem Vínculo (Nenhum)</option>
                          {times.map(t => (
                            <option key={t.id} value={t.id}>{t.nome}</option>
                          ))}
                        </select>
                      </div>

                      <button 
                        onClick={() => {
                          const roleSelect = document.getElementById(`role-select-${p.id}`);
                          const timeSelect = document.getElementById(`time-select-${p.id}`);
                          handleUpdateProfileByAdmin(p.id, roleSelect.value, timeSelect.value);
                        }} 
                        className="btn btn-primary"
                        style={{ padding: '8px 20px', fontSize: '0.85rem' }}
                      >
                        Salvar Vínculo
                      </button>
                    </div>
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

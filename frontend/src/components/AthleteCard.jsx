import React from 'react';
import { Shield, Award, User } from 'lucide-react';

export default function AthleteCard({ player }) {
  if (!player) return null;

  const {
    nome_completo,
    apelido,
    posicao,
    numero_camisa,
    role,
    avatar_url,
    ritmo = 60,
    finalizacao = 60,
    passe = 60,
    conducao = 60,
    defesa = 60,
    fisico = 60,
  } = player;

  // Calcula a média geral do overall
  const overall = Math.round(
    (ritmo + finalizacao + passe + conducao + defesa + fisico) / 6
  );

  // Define a classe CSS conforme a role
  let roleClass = '';
  let roleLabel = 'JOGADOR';
  if (role === 'admin') {
    roleClass = 'role-admin';
    roleLabel = 'ADMIN';
  } else if (role === 'analista') {
    roleClass = 'role-analista';
    roleLabel = 'ANALISTA';
  }

  // Fallback de avatar se não houver foto cadastrada
  const avatarSrc = avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${apelido || nome_completo}`;

  return (
    <div className="fut-card-container">
      <div className={`fut-card ${roleClass}`}>
        {/* Header do Card (Nota e Avatar) */}
        <div className="fut-card-header">
          <div className="fut-rating-box">
            <span className="fut-overall">{overall}</span>
            <span className="fut-pos">{posicao || 'LD'}</span>
            
            {/* Ícone conforme role */}
            <div style={{ marginTop: '8px', opacity: 0.8 }}>
              {role === 'admin' && <Shield size={18} />}
              {role === 'analista' && <Award size={18} />}
              {role === 'jogador' && <User size={18} />}
            </div>
          </div>

          <div className="fut-avatar-box">
            <img 
              src={avatarSrc} 
              alt={apelido || nome_completo}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${apelido || nome_completo}`;
              }}
            />
          </div>
        </div>

        {/* Nome / Apelido do Atleta */}
        <div className="fut-name">
          {apelido || nome_completo.split(' ')[0]}
        </div>

        {/* Grade de Atributos do FUT Card */}
        <div className="fut-stats-grid">
          <div className="fut-stat-item">
            <span className="fut-stat-val">{ritmo}</span>
            <span className="fut-stat-label">RIT</span>
          </div>
          <div className="fut-stat-item">
            <span className="fut-stat-val">{conducao}</span>
            <span className="fut-stat-label">CON</span>
          </div>
          
          <div className="fut-stat-item">
            <span className="fut-stat-val">{finalizacao}</span>
            <span className="fut-stat-label">FIN</span>
          </div>
          <div className="fut-stat-item">
            <span className="fut-stat-val">{defesa}</span>
            <span className="fut-stat-label">DEF</span>
          </div>
          
          <div className="fut-stat-item">
            <span className="fut-stat-val">{passe}</span>
            <span className="fut-stat-label">PAS</span>
          </div>
          <div className="fut-stat-item">
            <span className="fut-stat-val">{fisico}</span>
            <span className="fut-stat-label">FIS</span>
          </div>
        </div>

        {/* Número da camisa e rodapé do card */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          fontSize: '0.7rem', 
          fontWeight: '800', 
          opacity: 0.6,
          marginTop: '10px',
          borderTop: '1px solid rgba(0,0,0,0.1)'
        }}>
          <span>{roleLabel}</span>
          {numero_camisa && <span>#{numero_camisa}</span>}
        </div>
      </div>
    </div>
  );
}

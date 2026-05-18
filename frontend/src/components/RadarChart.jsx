import React from 'react';

export default function RadarChart({ stats, size = 300 }) {
  const {
    ritmo = 60,
    finalizacao = 60,
    passe = 60,
    conducao = 60,
    defesa = 60,
    fisico = 60,
  } = stats || {};

  const center = size / 2;
  const maxRadius = (size / 2) * 0.7; // Margem para rótulos

  // 6 Atributos em ordem
  const attributes = [
    { label: 'RIT', val: ritmo },
    { label: 'CON', val: conducao },
    { label: 'DEF', val: defesa },
    { label: 'FIS', val: fisico },
    { label: 'PAS', val: passe },
    { label: 'FIN', val: finalizacao },
  ];

  // Ângulos para as 6 pontas (60 graus cada)
  const getCoordinates = (index, value) => {
    const angle = (index * 60 - 90) * (Math.PI / 180);
    const radius = (value / 100) * maxRadius;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  };

  // 1. Gera os polígonos de grade de fundo (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [20, 40, 60, 80, 100];
  const gridPolygons = gridLevels.map((level) => {
    const points = attributes.map((_, i) => {
      const { x, y } = getCoordinates(i, level);
      return `${x},${y}`;
    }).join(' ');
    return points;
  });

  // 2. Gera o polígono dos dados reais do jogador
  const playerPoints = attributes.map((attr, i) => {
    const { x, y } = getCoordinates(i, attr.val);
    return `${x},${y}`;
  }).join(' ');

  // 3. Gera os rótulos de texto ligeiramente afastados
  const labels = attributes.map((attr, i) => {
    const { x, y } = getCoordinates(i, 115); // Afasta 15% além da borda máxima
    // Alinhamento inteligente do texto com base na posição
    let textAnchor = 'middle';
    if (x < center - 10) textAnchor = 'end';
    if (x > center + 10) textAnchor = 'start';
    
    let dy = '0.35em';
    if (y < center - 10) dy = '0';
    if (y > center + 10) dy = '0.7em';

    return (
      <text
        key={attr.label}
        x={x}
        y={y}
        fill="#94a3b8"
        fontSize="12"
        fontWeight="700"
        textAnchor={textAnchor}
        dy={dy}
      >
        {attr.label} ({attr.val})
      </text>
    );
  });

  // 4. Linhas de eixo do centro para as pontas
  const axisLines = attributes.map((_, i) => {
    const { x, y } = getCoordinates(i, 100);
    return (
      <line
        key={i}
        x1={center}
        y1={center}
        x2={x}
        y2={y}
        stroke="rgba(255, 255, 255, 0.08)"
        strokeWidth="1"
      />
    );
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg width={size} height={size} className="radar-svg">
        {/* Círculo central */}
        <circle cx={center} cy={center} r="3" fill="#39ff14" />

        {/* Polígonos de Grade de Fundo */}
        {gridPolygons.map((points, index) => (
          <polygon
            key={index}
            points={points}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />
        ))}

        {/* Linhas de Eixo */}
        {axisLines}

        {/* Polígono de Dados do Jogador */}
        <polygon
          points={playerPoints}
          fill="rgba(57, 255, 20, 0.18)"
          stroke="#39ff14"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />

        {/* Rótulos */}
        {labels}
      </svg>
    </div>
  );
}

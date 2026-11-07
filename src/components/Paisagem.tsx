/** A paisagem do Planalto Serrano: serra, araucárias e taboas na margem. */

function Araucaria({ x, y, e }: { x: number; y: number; e: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${e})`} fill="var(--serra-arvore)">
      <rect x="-0.9" y="-27" width="1.8" height="28" />
      <path d="M-15 -20Q-8 -29 0 -29Q8 -29 15 -20Q8 -25 0 -25Q-8 -25 -15 -20Z" />
      <path d="M-10 -27Q-5 -34 0 -34Q5 -34 10 -27Q5 -30.5 0 -30.5Q-5 -30.5 -10 -27Z" />
    </g>
  );
}

const DISTANTES: [number, number, number][] = [[34, 36, 0.62], [96, 30, 0.7], [176, 24, 0.6], [252, 28, 0.66], [322, 26, 0.7], [376, 30, 0.58]];
const PROXIMAS: [number, number, number][] = [[14, 52, 1.05], [68, 54, 0.9], [132, 50, 1.15], [214, 48, 0.95], [296, 52, 1.2], [358, 50, 1]];

export function Serra({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 70" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <path d="M0 42C40 26 70 36 110 26S180 16 220 28 300 14 340 26 390 32 400 26V70H0Z" fill="var(--serra-longe)" />
      {DISTANTES.map(([x, y, e]) => (
        <Araucaria key={x} x={x} y={y} e={e} />
      ))}
      <path d="M0 56C50 44 90 56 140 48S240 40 290 52 370 46 400 52V70H0Z" fill="var(--serra-perto)" />
      {PROXIMAS.map(([x, y, e]) => (
        <Araucaria key={x} x={x} y={y} e={e} />
      ))}
    </svg>
  );
}

export function Taboas({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 64 96" width="56" height="84" aria-hidden>
      <g fill="none" stroke="#3f6a2d" strokeLinecap="round">
        <path d="M14 96Q11 56 17 22" strokeWidth="2.2" />
        <path d="M30 96Q32 50 25 8" strokeWidth="2.4" />
        <path d="M46 96Q50 62 52 32" strokeWidth="2" />
        <path d="M22 96Q10 74 3 58" strokeWidth="3" stroke="#4f7f35" />
        <path d="M38 96Q46 72 60 58" strokeWidth="3" stroke="#4f7f35" />
      </g>
      <rect x="14.5" y="20" width="5.5" height="19" rx="2.7" fill="#7a5230" />
      <rect x="22.5" y="6" width="5.5" height="21" rx="2.7" fill="#6b4a2c" />
      <rect x="49.5" y="30" width="5" height="16" rx="2.5" fill="#7a5230" />
    </svg>
  );
}

/** Ondinha sem emenda: o trecho se repete a cada 100 unidades, então a animação não dá salto. */
export function Onda({ cor, className }: { cor: string; className?: string }) {
  const trechos = Array.from({ length: 8 }, (_, i) => `Q${i * 50 + 25} ${i % 2 ? 13 : 1} ${(i + 1) * 50} 7`).join("");
  return (
    <svg className={`rio-onda ${className ?? ""}`} viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden>
      <path d={`M0 7${trechos}V14H0Z`} fill={cor} />
    </svg>
  );
}

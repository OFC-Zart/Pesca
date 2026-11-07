export interface SaidaResumo {
  data: string;
  inicio: string;
  fim: string;
  localId: string;
  especieAlvo: string;
  capturas: { especie: string; quantidade: number }[];
}

/** Horas pescadas. Saída que vira a noite (fim antes do início) conta até o dia seguinte. */
export function horasDaSaida(inicio: string, fim: string): number {
  const min = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  let d = min(fim) - min(inicio);
  if (d <= 0) d += 24 * 60;
  return d / 60;
}

export interface LinhaCpue {
  especie: string;
  localId: string;
  peixes: number;
  horas: number;
  saidas: number;
  cpue: number;
}

/**
 * CPUE = peixes por hora por pescador, por espécie e local.
 * Entram as saídas que miraram a espécie ou que a capturaram, inclusive as que zeraram:
 * sem elas a média só contaria os dias bons.
 */
export function resumirCpue(saidas: SaidaResumo[]): LinhaCpue[] {
  const mapa = new Map<string, LinhaCpue>();
  for (const s of saidas) {
    const horas = horasDaSaida(s.inicio, s.fim);
    const porEspecie = new Map<string, number>([[s.especieAlvo, 0]]);
    for (const c of s.capturas) porEspecie.set(c.especie, (porEspecie.get(c.especie) ?? 0) + c.quantidade);
    for (const [especie, peixes] of porEspecie) {
      const chave = `${especie}|${s.localId}`;
      const l = mapa.get(chave) ?? { especie, localId: s.localId, peixes: 0, horas: 0, saidas: 0, cpue: 0 };
      l.peixes += peixes;
      l.horas += horas;
      l.saidas += 1;
      l.cpue = l.peixes / l.horas;
      mapa.set(chave, l);
    }
  }
  return [...mapa.values()].sort((a, b) => b.cpue - a.cpue);
}

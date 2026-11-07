import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CONFIANCA_TABELA, ESPECIES, ESPECIE_IDS, PESOS } from "@/config/indice";
import { calibrar, inerciaDoLocal, prepararHoras, regressao, simularAgua } from "@/lib/indice/agua";
import { calcularAstro } from "@/lib/indice/astro";
import {
  agruparDias,
  apetite,
  avaliarDia,
  condicoes,
  confiancaTabela,
  escala,
  fatoresDaHora,
  fraseMotivo,
  janelaDeLuz,
  melhorHora,
  notaChuva,
  notaDaHora,
  notaLua,
  notaNuvens,
  notaPressao,
  notaTendencia,
  notaVento,
} from "@/lib/indice/calculo";
import { hojeEmSaoPaulo, montarPrevisao } from "@/lib/indice/previsao";
import type { Astro, Fatores, HoraClima, Local, SerieClima } from "@/lib/indice/tipos";
import { horasDaSaida, resumirCpue } from "@/lib/cpue";

const { traira, tilapia, jundia, carpaCapim, bass } = ESPECIES;
const media = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

describe("apetite pela temperatura", () => {
  it("zero nos limites e cheio na faixa ótima", () => {
    expect(apetite(11, traira)).toBe(0);
    expect(apetite(36, traira)).toBe(0);
    expect(apetite(24, traira)).toBe(1);
    expect(apetite(30, traira)).toBe(1);
  });

  it("tilápia não come abaixo de 16 °C, como dizem a Epagri e os estudos", () => {
    expect(apetite(16, tilapia)).toBe(0);
    expect(apetite(12, tilapia)).toBe(0);
    expect(apetite(20, tilapia)).toBeLessThan(0.35);
    expect(apetite(28, tilapia)).toBe(1);
  });

  it("abaixo do ótimo a curva é côncava: o meio do caminho rende menos que a metade", () => {
    expect(apetite(21, tilapia)).toBeCloseTo(0.5 ** 1.3, 5);
    expect(apetite(21, tilapia)).toBeLessThan(0.5);
  });

  it("acima do ótimo cai em linha reta até o limite", () => {
    expect(apetite(33, traira)).toBeCloseTo(0.5);
  });

  it("jundiá aguenta mais frio que traíra, e traíra mais que tilápia", () => {
    expect(apetite(14, jundia)).toBeGreaterThan(apetite(14, traira));
    expect(apetite(18, traira)).toBeGreaterThan(apetite(18, tilapia));
  });

  it("toda espécie tem faixas em ordem", () => {
    for (const id of ESPECIE_IDS) {
      const e = ESPECIES[id];
      expect(e.min).toBeLessThan(e.otMin);
      expect(e.otMin).toBeLessThan(e.otMax);
      expect(e.otMax).toBeLessThan(e.max);
    }
  });
});

describe("condições do momento", () => {
  it("lua: 1 na nova e na cheia, 0,5 nos quartos", () => {
    expect(notaLua(0)).toBeCloseTo(1);
    expect(notaLua(29.53 / 2)).toBeCloseTo(1);
    expect(notaLua(29.53 / 4)).toBeCloseTo(0.5);
  });

  it("pressão: subir rápido, sinal de frente fria, é o pior caso", () => {
    expect(notaPressao(0)).toBe(0.85);
    expect(notaPressao(-4)).toBe(1);
    expect(notaPressao(-7)).toBe(0.65);
    expect(notaPressao(5)).toBe(0.3);
  });

  it("vento", () => {
    expect(notaVento(0.5)).toBe(0.7);
    expect(notaVento(3)).toBe(1);
    expect(notaVento(6)).toBe(0.55);
    expect(notaVento(9)).toBe(0.15);
  });

  it("chuva depende do peixe, e a chuva forte daquela hora pesa", () => {
    expect(notaChuva(5, 0, traira)).toBe(1);
    expect(notaChuva(20, 0, traira)).toBeCloseTo(0.65);
    expect(notaChuva(40, 0, traira)).toBe(0.3);
    expect(notaChuva(40, 0, jundia)).toBe(0.8);
    expect(notaChuva(5, 6, traira)).toBeCloseTo(0.7);
  });

  it("nuvens só contam de dia", () => {
    expect(notaNuvens(60, true, tilapia)).toBe(1);
    expect(notaNuvens(10, true, traira)).toBe(0.6);
    expect(notaNuvens(95, true, traira)).toBe(0.85);
    expect(notaNuvens(10, false, traira)).toBe(1);
  });

  it("tendência: quanto mais a água esfria, pior", () => {
    expect(notaTendencia(18, 2, traira)).toBe(1);
    expect(notaTendencia(18, 0, traira)).toBeCloseTo(0.91, 2);
    expect(notaTendencia(18, -1, traira)).toBeCloseTo(0.7);
    expect(notaTendencia(18, -2, traira)).toBeCloseTo(0.45);
    expect(notaTendencia(18, -6, traira)).toBe(0.1);
  });

  it("água quente demais: esfriar ajuda", () => {
    expect(notaTendencia(33, -1, traira)).toBe(1);
    expect(notaTendencia(33, 1, traira)).toBe(0.7);
  });

  it("os pesos das condições somam 1", () => {
    expect(Object.values(PESOS).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });

  it("escala nas fronteiras", () => {
    expect([30, 31, 50, 51, 70, 71, 85, 86, 100].map((n) => escala(n).nome)).toEqual([
      "Fraco", "Regular", "Regular", "Bom", "Bom", "Muito bom", "Muito bom", "Excelente", "Excelente",
    ]);
    expect(escala(90).peixes).toBe(5);
  });
});

const tudoBom: Fatores = { agua: 1, tendencia: 1, pressao: 1, vento: 1, chuva: 1, lua: 1, nuvens: 1, rio: 1, represa: 1 };

describe("a nota é um produto", () => {
  it("tudo perfeito dá 100", () => {
    expect(notaDaHora(tudoBom, 1)).toBe(100);
  });

  it("sem apetite, nenhum clima salva: era o principal erro da fórmula antiga", () => {
    expect(notaDaHora({ ...tudoBom, agua: 0 }, 1)).toBe(0);
  });

  it("água pela metade corta a nota pela metade", () => {
    expect(notaDaHora({ ...tudoBom, agua: 0.5 }, 1)).toBe(50);
    expect(notaDaHora(tudoBom, 0.5)).toBe(50);
  });

  it("confere a conta à mão", () => {
    const f: Fatores = { agua: 0.8, tendencia: 0.9, vento: 1, chuva: 1, nuvens: 1, pressao: 0.85, lua: 0.75, rio: 1, represa: 1 };
    const c = 0.3 * 0.9 + 0.2 + 0.2 + 0.15 + 0.1 * 0.85 + 0.05 * 0.75;
    expect(condicoes(f)).toBeCloseTo(c);
    expect(notaDaHora(f, 0.9)).toBe(Math.round(100 * 0.8 * 0.9 * c ** 2));
  });

  it("condições medianas não chegam a Excelente", () => {
    const medianas: Fatores = { ...tudoBom, tendencia: 0.9, vento: 0.7, pressao: 0.85, nuvens: 0.85, lua: 0.75 };
    expect(escala(notaDaHora(medianas, 1)).nome).not.toBe("Excelente");
  });
});

const astro: Astro = { nascerSol: 5.5, porSol: 19, nascerLua: 2, porLua: 15, luaAlta: 9, luaBaixa: 21.5, idadeLua: 1, iluminacao: 0.1, crescente: true };

describe("janela de luz", () => {
  it("bass: cheio no amanhecer e entardecer, fraco no meio do dia", () => {
    expect(janelaDeLuz(5, bass, astro)).toBe(1);
    expect(janelaDeLuz(18, bass, astro)).toBe(1);
    expect(janelaDeLuz(12, bass, astro)).toBe(0.45);
  });

  it("a diferença entre horas agora é grande, como no estudo com bass: o pior vale menos da metade do melhor", () => {
    expect(janelaDeLuz(12, bass, astro) / janelaDeLuz(18, bass, astro)).toBeLessThan(0.5);
  });

  it("noturno: rende de noite e mal de dia", () => {
    expect(janelaDeLuz(22, jundia, astro)).toBeGreaterThan(0.9);
    expect(janelaDeLuz(12, jundia, astro)).toBe(0.25);
  });

  it("o começo da noite rende um pouco mais que a madrugada, sem empatar em meia-noite", () => {
    expect(janelaDeLuz(21, jundia, astro)).toBeGreaterThan(janelaDeLuz(2, jundia, astro));
  });

  it("diurno: tilápia e carpa capim de dia", () => {
    expect(janelaDeLuz(12, tilapia, astro)).toBe(1);
    expect(janelaDeLuz(23, tilapia, astro)).toBeLessThan(0.15);
    expect(janelaDeLuz(12, carpaCapim, astro)).toBe(1);
  });

  it("a transição é suave, sem salto de uma hora para outra", () => {
    for (const id of ESPECIE_IDS) {
      for (let h = 1; h < 24; h++) {
        const salto = Math.abs(janelaDeLuz(h, ESPECIES[id], astro) - janelaDeLuz(h - 1, ESPECIES[id], astro));
        expect(salto).toBeLessThanOrEqual(0.71);
      }
    }
  });

  it("melhor hora respeita as horas que já passaram", () => {
    const h = Array(24).fill(10);
    h[3] = 50;
    h[20] = 30;
    expect(melhorHora(h)).toBe(3);
    expect(melhorHora(h, 10)).toBe(20);
  });
});

describe("água estimada", () => {
  const constante = (temp: number, sol: number, horas: number) => ({ temp: Array(horas).fill(temp), sol: Array(horas).fill(sol) });
  const acude = { tipo: "acude" } as const;

  it("sem sol, a água chega à temperatura do ar", () => {
    expect(simularAgua(constante(18, 0, 24 * 90), acude).at(-1)!).toBeCloseTo(18, 1);
  });

  it("com sol, fica acima do ar: 300 W/m² dão uns 4 °C, como nos açudes medidos", () => {
    const agua = simularAgua(constante(20, 300, 24 * 90), acude).at(-1)!;
    expect(agua - 20).toBeGreaterThan(3.5);
    expect(agua - 20).toBeLessThan(4.6);
  });

  it("açude fundo muda mais devagar que açude raso", () => {
    const degrau = { temp: [...Array(24 * 60).fill(25), ...Array(24 * 3).fill(10)], sol: Array(24 * 63).fill(0) };
    const raso = simularAgua(degrau, { tipo: "acude", profundidade: 1 }).at(-1)!;
    const fundo = simularAgua(degrau, { tipo: "acude", profundidade: 5 }).at(-1)!;
    expect(raso).toBeLessThan(fundo);
    expect(fundo).toBeGreaterThan(18);
    expect(inerciaDoLocal({ tipo: "acude", profundidade: 5 })).toBeCloseTo(9.7);
  });

  it("frente fria curta não derruba o açude na hora: água tem inércia", () => {
    const frente = { temp: [...Array(24 * 60).fill(22), ...Array(24).fill(8)], sol: Array(24 * 61).fill(0) };
    expect(simularAgua(frente, acude).at(-1)!).toBeGreaterThan(18);
  });

  it("buraco nos dados não quebra", () => {
    const r = simularAgua({ temp: [20, null, null, 20], sol: [null, 100, null, 100] }, acude);
    expect(r.every((x) => Number.isFinite(x))).toBe(true);
  });

  it("confere com a água medida pela Epagri em Caçador, 2009", () => {
    const c = JSON.parse(readFileSync("tests/dados/cacador-2009.json", "utf8"));
    const agua = simularAgua({ temp: c.temp, sol: c.sol }, acude);
    const naHora = (hh: string) => c.tempo.map((t: string, i: number) => (t >= "2009-03-23" && t.slice(11, 13) === hh ? agua[i] : null)).filter((x: number | null) => x !== null);
    expect(Math.abs(media(naHora("09")) - 15.9)).toBeLessThan(0.5);
    expect(Math.abs(media(naHora("15")) - 16.9)).toBeLessThan(0.6);
    expect(media(naHora("15"))).toBeGreaterThan(media(naHora("09")));
  });
});

describe("calibração pelo termômetro", () => {
  it("regressão recupera a reta", () => {
    const r = regressao([10, 15, 20].map((x) => ({ x, y: 3 + 0.8 * x })))!;
    expect(r.a).toBeCloseTo(3);
    expect(r.b).toBeCloseTo(0.8);
  });

  it("com menos de 3 medições não mexe em nada", () => {
    expect(calibrar([{ x: 20, y: 22 }, { x: 21, y: 23 }])).toBeNull();
  });

  it("com poucas medições, corrige só o desvio médio", () => {
    expect(calibrar([{ x: 20, y: 22 }, { x: 21, y: 22 }, { x: 22, y: 25 }])).toEqual({ a: 2, b: 1 });
  });

  it("muitas medições na mesma época também não viram reta: seria ruído", () => {
    const pontos = Array.from({ length: 12 }, (_, i) => ({ x: 20 + i * 0.1, y: 22 + i * 0.3 }));
    expect(calibrar(pontos)!.b).toBe(1);
  });

  it("muitas medições em épocas diferentes viram reta", () => {
    const pontos = Array.from({ length: 12 }, (_, i) => ({ x: 12 + i, y: 2 + 0.9 * (12 + i) }));
    const c = calibrar(pontos)!;
    expect(c.a).toBeCloseTo(2);
    expect(c.b).toBeCloseTo(0.9);
  });

  it("reta absurda é recusada", () => {
    const pontos = Array.from({ length: 12 }, (_, i) => ({ x: 12 + i, y: 40 - 2 * i }));
    expect(calibrar(pontos)!.b).toBe(1);
  });
});

function serieFalsa(inicio: string, dias: number, sobre: Partial<Record<keyof SerieClima, (h: number) => number | null>> = {}): SerieClima {
  const tempo: string[] = [];
  const base = Date.UTC(+inicio.slice(0, 4), +inicio.slice(5, 7) - 1, +inicio.slice(8, 10));
  for (let h = 0; h < dias * 24; h++) tempo.push(new Date(base + h * 3600000).toISOString().slice(0, 16));
  const v = (k: keyof SerieClima, d: number) => tempo.map((_, h) => (sobre[k] ? sobre[k]!(h) : d));
  return {
    tempo,
    temp: v("temp", 24), pressao: v("pressao", 1015), vento: v("vento", 3),
    chuva: v("chuva", 0), nuvens: v("nuvens", 60), codigo: v("codigo", 1), sol: v("sol", 150),
  };
}

const local: Local = { id: "x", nome: "X", tipo: "acude", lat: -27.8, lon: -50.88 };

describe("horas preparadas", () => {
  it("chuva de 48 h é uma soma móvel", () => {
    const h = prepararHoras(serieFalsa("2026-11-01", 4, { chuva: (i) => (i === 10 ? 20 : 0) }), local);
    expect(h[9].chuva48h).toBe(0);
    expect(h[10].chuva48h).toBe(20);
    expect(h[57].chuva48h).toBe(20);
    expect(h[58].chuva48h).toBe(0);
  });

  it("variação da pressão compara com 24 h antes", () => {
    const h = prepararHoras(serieFalsa("2026-11-01", 3, { pressao: (i) => 1000 + i }), local);
    expect(h[30].deltaPressao24h).toBe(24);
  });

  it("calibração do local entra na água, mas a saída do modelo fica guardada para recalibrar", () => {
    const s = serieFalsa("2026-11-01", 3);
    const sem = prepararHoras(s, local);
    const com = prepararHoras(s, { ...local, calibA: 2, calibB: 1 });
    expect(com[50].tempAgua).toBeCloseTo(sem[50].tempAgua + 2);
    expect(com[50].aguaModelo).toBeCloseTo(sem[50].aguaModelo);
  });

  it("data e hora locais saem do texto, sem depender do fuso do servidor", () => {
    const h = prepararHoras(serieFalsa("2026-11-01", 1), local);
    expect(h[5].data).toBe("2026-11-01");
    expect(h[5].hora).toBe(5);
  });
});

describe("dia avaliado", () => {
  const horaBase: HoraClima = { data: "2026-11-06", hora: 0, tempAr: 20, tempAgua: 25, aguaModelo: 25, deltaAgua48h: 0, deltaPressao24h: 0, vento: 3, chuvaHora: 0, chuva48h: 0, nuvens: 60 };
  const dia = (sobre: Partial<HoraClima> = {}) => Array.from({ length: 24 }, (_, hora) => ({ ...horaBase, hora, ...sobre }));

  it("nota do dia é a média das 4 melhores horas e a melhor hora vem junto", () => {
    const av = avaliarDia(dia(), traira, astro);
    const topo = [...av.horas].sort((a, b) => b - a).slice(0, 4);
    expect(av.nota).toBe(Math.round(media(topo)));
    expect(av.horas[av.melhor.hora]).toBe(Math.max(...av.horas));
    expect(av.horas).toHaveLength(24);
  });

  it("água gelada dá Fraco para a tilápia, com qualquer clima", () => {
    const av = avaliarDia(dia({ tempAgua: 13 }), tilapia, astro);
    expect(av.nota).toBe(0);
    expect(escala(av.nota).nome).toBe("Fraco");
  });

  it("frente fria derruba a nota do mesmo dia", () => {
    const normal = avaliarDia(dia(), traira, astro).nota;
    const frente = avaliarDia(dia({ deltaAgua48h: -3, deltaPressao24h: 6 }), traira, astro).nota;
    expect(frente).toBeLessThan(normal * 0.8);
  });

  it("o melhor horário muda com o peixe", () => {
    const pico = (id: keyof typeof ESPECIES) => avaliarDia(dia(), ESPECIES[id], astro).melhor.hora;
    expect([4, 5, 6, 17, 18, 19]).toContain(pico("bass"));
    expect([19, 20, 21, 22, 23]).toContain(pico("jundia"));
    expect(janelaDeLuz(pico("tilapia"), tilapia, astro)).toBe(1);
  });

  it("vento forte naquela hora pesa só naquela hora", () => {
    const horas = dia().map((h) => (h.hora === 18 ? { ...h, vento: 10 } : h));
    const av = avaliarDia(horas, bass, astro);
    expect(av.horas[18]).toBeLessThan(av.horas[17]);
  });

  it("a frase diz o motivo real, com o artigo certo", () => {
    const f = fatoresDaHora({ ...horaBase, tempAgua: 13 }, tilapia, astro);
    expect(fraseMotivo("tilapia", 0, f, { ...horaBase, tempAgua: 13 })).toContain("a tilápia praticamente não come");
    const g = fatoresDaHora({ ...horaBase, tempAgua: 9 }, jundia, astro);
    expect(fraseMotivo("jundia", 5, g, { ...horaBase, tempAgua: 9 })).toContain("o jundiá só come bem");
  });
});

describe("astronomia em Cerro Negro", () => {
  const a = calcularAstro("2026-11-06", -27.8, -50.88, -10800);
  it("nascer e pôr do sol plausíveis para novembro", () => {
    expect(a.nascerSol!).toBeGreaterThan(5);
    expect(a.nascerSol!).toBeLessThan(6);
    expect(a.porSol!).toBeGreaterThan(18.5);
    expect(a.porSol!).toBeLessThan(19.5);
  });
  it("lua minguante a uns 3 dias da nova", () => {
    expect(a.crescente).toBe(false);
    expect(a.idadeLua).toBeGreaterThan(26);
    expect(a.idadeLua).toBeLessThan(28);
    expect(notaLua(a.idadeLua)).toBeGreaterThan(0.85);
  });
});

describe("confiança", () => {
  it("segue a tabela e interpola", () => {
    expect(confiancaTabela(0, CONFIANCA_TABELA)).toBe(95);
    expect(confiancaTabela(3, CONFIANCA_TABELA)).toBe(80);
    expect(confiancaTabela(2, CONFIANCA_TABELA)).toBe(85);
    expect(confiancaTabela(15, CONFIANCA_TABELA)).toBe(30);
  });
});

describe("previsão montada", () => {
  const comum = { local, locais: [local], offsetSeg: -10800, hoje: "2026-11-06", agora: new Date("2026-11-06T15:00:00Z") };

  it("fases por dia: 3 completos, 4 em faixa, resto tendência", () => {
    const p = montarPrevisao({ ...comum, serie: serieFalsa("2026-10-30", 23), cenarios: null });
    expect(p.dias).toHaveLength(16);
    expect(p.dias.slice(0, 3).every((d) => d.fase === "completa")).toBe(true);
    expect(p.dias.slice(3, 7).every((d) => d.fase === "faixa")).toBe(true);
    expect(p.dias.slice(7).every((d) => d.fase === "tendencia")).toBe(true);
    expect(p.dias[0].especies.traira.horas).toHaveLength(24);
    expect(p.dias[4].especies.traira.horas).toBeNull();
    expect(p.dias[8].especies.traira.nota).toBeNull();
    expect(p.dias[8].especies.traira.fatores.agua).toBeGreaterThan(0);
    expect(p.fonteConfianca).toBe("tabela");
    expect(p.versaoModelo).toBe(3);
  });

  it("inverno: peixe de água quente despenca, e jundiá e carpa aguentam melhor", () => {
    const inverno = serieFalsa("2026-10-30", 23, { temp: () => 11, sol: () => 120 });
    const d = montarPrevisao({ ...comum, serie: inverno, cenarios: null }).dias[0];
    expect(d.especies.tilapia.nota).toBe(0);
    expect(d.especies.jundia.nota!).toBeGreaterThan(d.especies.traira.nota!);
    expect(d.especies.carpaComum.nota!).toBeGreaterThan(d.especies.dourado.nota!);
    expect(escala(d.especies.traira.nota!).nome).toBe("Fraco");
  });

  it("verão com água boa dá nota alta", () => {
    const verao = serieFalsa("2026-10-30", 23, { temp: () => 22, sol: () => 280 });
    const d = montarPrevisao({ ...comum, serie: verao, cenarios: null }).dias[0];
    expect(d.especies.traira.nota!).toBeGreaterThan(70);
    expect(d.especies.jundia.nota!).toBeGreaterThan(70);
  });

  it("guarda o clima da melhor hora junto da nota", () => {
    const d = montarPrevisao({ ...comum, serie: serieFalsa("2026-10-30", 23), cenarios: null }).dias[0];
    const n = d.especies.jundia;
    expect(n.horas![n.base.hora]).toBe(Math.max(...n.horas!));
    expect(n.base.vento).toBe(3);
    expect(n.horario).toBeGreaterThan(0.8);
  });

  it("bloqueia por vento forte e por tempestade", () => {
    const vento = serieFalsa("2026-10-30", 23, { vento: (h) => (h === 7 * 24 + 15 ? 14 : 3) });
    const p1 = montarPrevisao({ ...comum, serie: vento, cenarios: null });
    expect(p1.dias[0].bloqueio).toContain("Vento");
    expect(p1.dias[0].horasInseguras).toEqual([15]);
    expect(p1.dias[1].bloqueio).toBeNull();

    const raio = serieFalsa("2026-10-30", 23, { codigo: (h) => (h === 7 * 24 + 15 ? 95 : 1) });
    expect(montarPrevisao({ ...comum, serie: raio, cenarios: null }).dias[0].bloqueio).toContain("Tempestade");
  });

  it("ensemble: faixa dos cenários, mediana nos dias 4 a 7", () => {
    const serie = serieFalsa("2026-10-30", 23);
    const cenarios = [12, 16, 20, 24, 28].map((t) => serieFalsa("2026-10-30", 15, { temp: () => t }));
    const p = montarPrevisao({ ...comum, serie, cenarios });
    const d = p.dias[4].especies.bass;
    expect(p.fonteConfianca).toBe("ensemble");
    expect(d.min!).toBeLessThanOrEqual(d.nota!);
    expect(d.max!).toBeGreaterThanOrEqual(d.nota!);
    expect(d.max! - d.min!).toBeGreaterThan(0);
  });

  it("a nota nunca sai da faixa mostrada", () => {
    const p = montarPrevisao({ ...comum, serie: serieFalsa("2026-10-30", 23), cenarios: null });
    for (const d of p.dias.slice(0, 7)) {
      for (const e of Object.values(d.especies)) {
        expect(e.min!).toBeLessThanOrEqual(e.nota!);
        expect(e.max!).toBeGreaterThanOrEqual(e.nota!);
      }
    }
  });

  it("agruparDias ignora buracos sem quebrar", () => {
    const s = serieFalsa("2026-11-01", 2, { temp: (h) => (h < 24 ? null : 20) });
    const d = agruparDias(s);
    expect(d).toHaveLength(1);
    expect(d[0].data).toBe("2026-11-02");
  });

  it("data de hoje usa o fuso de São Paulo, não o do servidor", () => {
    expect(hojeEmSaoPaulo(new Date("2026-11-07T02:00:00Z"))).toBe("2026-11-06");
  });
});

describe("CPUE", () => {
  it("horas, inclusive virando a noite", () => {
    expect(horasDaSaida("06:00", "09:30")).toBe(3.5);
    expect(horasDaSaida("22:00", "02:00")).toBe(4);
  });
  it("saída zerada entra na conta", () => {
    const r = resumirCpue([
      { data: "2026-11-01", inicio: "06:00", fim: "10:00", localId: "a", especieAlvo: "Traíra", capturas: [{ especie: "Traíra", quantidade: 4 }] },
      { data: "2026-11-02", inicio: "06:00", fim: "10:00", localId: "a", especieAlvo: "Traíra", capturas: [] },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].cpue).toBe(0.5);
    expect(r[0].saidas).toBe(2);
  });
});

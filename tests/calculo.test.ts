import { describe, expect, it } from "vitest";
import { CONFIANCA_TABELA, ESPECIES } from "@/config/indice";
import { calcularAstro } from "@/lib/indice/astro";
import {
  agruparDias,
  calcularBrutos,
  calcularFatores,
  confiancaTabela,
  escala,
  estimarAgua,
  janelaDaHora,
  melhorHora,
  notaChuva,
  notaLua,
  notaNuvens,
  notaPressao,
  notaTendencia,
  notaVento,
  notasPorHora,
  regressao,
  somarNota,
  trapezio,
} from "@/lib/indice/calculo";
import { hojeEmSaoPaulo, montarPrevisao } from "@/lib/indice/previsao";
import type { Astro, DiaClima, Local, SerieClima } from "@/lib/indice/tipos";
import { horasDaSaida, resumirCpue } from "@/lib/cpue";

const traira = ESPECIES.traira;

describe("fatores da seção 3", () => {
  it("curva trapezoidal", () => {
    expect(trapezio(25, traira)).toBe(1);
    expect(trapezio(14, traira)).toBe(0);
    expect(trapezio(33, traira)).toBe(0);
    expect(trapezio(18, traira)).toBeCloseTo(0.5);
    expect(trapezio(30.5, traira)).toBeCloseTo(0.5);
  });

  it("lua: 1 na nova e na cheia, 0,5 nos quartos, 0,90 no exemplo do documento", () => {
    expect(notaLua(0)).toBeCloseTo(1);
    expect(notaLua(29.53 / 2)).toBeCloseTo(1);
    expect(notaLua(29.53 / 4)).toBeCloseTo(0.5);
    expect(notaLua(29.53 - 3)).toBeCloseTo(0.9, 1);
  });

  it("pressão", () => {
    expect(notaPressao(0)).toBe(0.8);
    expect(notaPressao(-4)).toBe(1);
    expect(notaPressao(-7)).toBe(0.6);
    expect(notaPressao(5)).toBe(0.2);
    expect(notaPressao(3)).toBe(0.8);
  });

  it("vento", () => {
    expect(notaVento(0.5)).toBe(0.6);
    expect(notaVento(3)).toBe(1);
    expect(notaVento(6)).toBe(0.5);
    expect(notaVento(9)).toBe(0.1);
  });

  it("chuva usa o perfil da espécie só acima de 30 mm", () => {
    expect(notaChuva(5, traira)).toBe(1);
    expect(notaChuva(20, traira)).toBe(0.6);
    expect(notaChuva(40, traira)).toBe(0.3);
    expect(notaChuva(40, ESPECIES.jundia)).toBe(0.8);
  });

  it("nuvens: céu limpo vem do perfil; muito fechado vale 0,6", () => {
    expect(notaNuvens(60, ESPECIES.tilapia)).toBe(1);
    expect(notaNuvens(10, ESPECIES.tilapia)).toBe(1);
    expect(notaNuvens(10, traira)).toBe(0.6);
    expect(notaNuvens(95, ESPECIES.tilapia)).toBe(0.6);
  });

  it("tendência", () => {
    expect(notaTendencia(18, 2, traira)).toBe(1);
    expect(notaTendencia(18, 0, traira)).toBe(0.5);
    expect(notaTendencia(18, -4, traira)).toBe(0.2);
    expect(notaTendencia(30, 2, traira)).toBe(0.5);
  });

  it("escala nas fronteiras", () => {
    expect([30, 31, 50, 51, 70, 71, 85, 86, 100].map((n) => escala(n).nome)).toEqual([
      "Fraco", "Regular", "Regular", "Bom", "Bom", "Muito bom", "Muito bom", "Excelente", "Excelente",
    ]);
    expect(escala(90).peixes).toBe(5);
  });

  it("os pesos somam 1: tudo em 1 dá 100", () => {
    expect(somarNota({ agua: 1, tendencia: 1, pressao: 1, vento: 1, chuva: 1, lua: 1, nuvens: 1 })).toBe(100);
  });
});

describe("água estimada (seção 4)", () => {
  const dias = [10, 12, 14, 16, 18, 20, 22, 24].map((temp, i) => ({ temp, data: `d${i}` })) as DiaClima[];
  const i = 7;
  it("rio: média de 3 dias", () => expect(estimarAgua(dias, i, { tipo: "rio" })).toBeCloseTo(22));
  it("açude: média de 7 dias + 1", () => expect(estimarAgua(dias, i, { tipo: "acude" })).toBeCloseTo(19));
  it("rio de truta: 0,7 × 3 dias + 3", () => expect(estimarAgua(dias, i, { tipo: "rio_truta" })).toBeCloseTo(18.4));
  it("calibração do local tem prioridade", () =>
    expect(estimarAgua(dias, i, { tipo: "rio", calibA: 2, calibB: 0.5 })).toBeCloseTo(13));
  it("regressão recupera a reta", () => {
    const r = regressao([10, 15, 20].map((x) => ({ x, y: 3 + 0.8 * x })))!;
    expect(r.a).toBeCloseTo(3);
    expect(r.b).toBeCloseTo(0.8);
  });
});

describe("janela por hora", () => {
  const astro: Astro = {
    nascerSol: 5.5, porSol: 19, nascerLua: 2, porLua: 15, luaAlta: 9, luaBaixa: 21.5,
    idadeLua: 1, iluminacao: 0.1, crescente: true,
  };
  it("misto: sol, solunar maior, menor e resto", () => {
    expect(janelaDaHora(5, "misto", astro)).toBe(1);
    expect(janelaDaHora(19, "misto", astro)).toBe(1);
    expect(janelaDaHora(9, "misto", astro)).toBe(0.8);
    expect(janelaDaHora(2, "misto", astro)).toBe(0.6);
    expect(janelaDaHora(12, "misto", astro)).toBe(0.3);
  });
  it("diurno: 7h às 17h", () => {
    expect(janelaDaHora(7, "diurno", astro)).toBe(1);
    expect(janelaDaHora(16, "diurno", astro)).toBe(1);
    expect(janelaDaHora(17, "diurno", astro)).toBe(0.3);
    expect(janelaDaHora(23, "diurno", astro)).toBe(0.3);
  });
  it("noturno: 19h às 5h com 0,9", () => {
    expect(janelaDaHora(19, "noturno", astro)).toBe(0.9);
    expect(janelaDaHora(2, "noturno", astro)).toBe(0.9);
    expect(janelaDaHora(5, "noturno", astro)).toBe(0.3);
    expect(janelaDaHora(12, "noturno", astro)).toBe(0.3);
  });
  it("nota da hora = dia × (0,7 + 0,3 × janela)", () => {
    const h = notasPorHora(80, ESPECIES.carpaComum, astro);
    expect(h).toHaveLength(24);
    expect(h[5]).toBe(80);
    expect(h[12]).toBe(Math.round(80 * 0.79));
  });
  it("melhor hora respeita as horas que já passaram", () => {
    const h = Array(24).fill(10);
    h[3] = 50;
    h[20] = 30;
    expect(melhorHora(h)).toBe(3);
    expect(melhorHora(h, 10)).toBe(20);
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

function serieFalsa(inicio: string, dias: number, sobre: Partial<Record<keyof SerieClima, (h: number) => number | null>> = {}): SerieClima {
  const tempo: string[] = [];
  const base = Date.UTC(+inicio.slice(0, 4), +inicio.slice(5, 7) - 1, +inicio.slice(8, 10));
  for (let h = 0; h < dias * 24; h++) tempo.push(new Date(base + h * 3600000).toISOString().slice(0, 16));
  const v = (k: keyof SerieClima, d: number) => tempo.map((_, h) => (sobre[k] ? sobre[k]!(h) : d));
  return {
    tempo,
    temp: v("temp", 24), pressao: v("pressao", 1015), vento: v("vento", 3),
    chuva: v("chuva", 0), nuvens: v("nuvens", 60), codigo: v("codigo", 1),
  };
}

describe("previsão montada", () => {
  const local: Local = { id: "x", nome: "X", tipo: "rio", lat: -27.8, lon: -50.88 };
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
    expect(p.fonteConfianca).toBe("tabela");
  });

  it("calcula a nota à mão no dia estável", () => {
    const p = montarPrevisao({ ...comum, serie: serieFalsa("2026-10-30", 23), cenarios: null });
    const d = p.dias[0];
    // água 24 °C = 1 (0,35) · estável 0,5 (0,05) · pressão estável 0,8 (0,12) · vento 1 (0,10) · chuva 1 (0,10) · nuvens 1 (0,10) · lua × 0,10
    expect(d.especies.traira.nota).toBe(Math.round(100 * (0.82 + 0.1 * notaLua(d.astro.idadeLua))));
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

  it("ensemble: faixa dos cenários, mediana nos dias 4 a 7, confiança pela largura", () => {
    const serie = serieFalsa("2026-10-30", 23);
    const cenarios = [18, 20, 22, 24, 26].map((t) => serieFalsa("2026-10-30", 15, { temp: () => t }));
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
    expect(calcularFatores(calcularBrutos(d, 0, local), 1, traira).agua).toBeCloseTo(0.75);
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

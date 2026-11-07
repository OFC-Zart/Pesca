import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MODELO_IDS, PONTOS_VERIFICACAO, REPRESAS, faixaDaHora, represaMaisPerto, type ModeloId, type VariavelId } from "@/config/fontes";
import { PESOS_POR_TIPO } from "@/config/indice";
import { chuvaPorHora, lerXmlAna, lerXmlAnaComDados, urlAna, variacaoNivel } from "@/lib/fontes/ana";
import { estacaoDoRio, horaCheiaLocal, represaDoLocal } from "@/lib/fontes/coletar";
import { lerJsonEpagri, lerJsonInmet, pressaoNoMar } from "@/lib/fontes/estacoes";
import { estadoDaFonte } from "@/lib/fontes/estado";
import { comprimir, descomprimir } from "@/lib/fontes/guardar";
import { antecedencia, combinar, discordanciaPorDia, lerModelos, resumoDeHoje, seriesPorModelo, substituirFuturo, type PrevisaoModelos } from "@/lib/fontes/modelos";
import { aplicarObservado, combinarChuva, corrigirAltitude, doEstacao, observadoVazio } from "@/lib/fontes/observado";
import { lerCsvOns, recortarCsvOns, variacao7Dias } from "@/lib/fontes/ons";
import { agregarFaixas, calcularPrecisao, linhasDePrevisao, linhasDeRodadasAnteriores, type Par } from "@/lib/fontes/precisao";
import { notaRepresa, notaRio } from "@/lib/indice/calculo";
import { montarPrevisao } from "@/lib/indice/previsao";
import type { Local, SerieClima } from "@/lib/indice/tipos";

/** Mesmo formato do serviço DadosHidrometeorologicos da ANA, visto em 07/11/2026 (mais novo primeiro). */
function xmlAna(linhas: { t: string; nivel?: string; chuva?: string }[]) {
  const corpo = linhas
    .map(
      (l, i) => `    <DadosHidrometereologicos diffgr:id="DadosHidrometereologicos${i + 1}" msdata:rowOrder="${i}">
      <CodEstacao>71350001</CodEstacao>
      <DataHora>${l.t}</DataHora>
      <Vazao>258.23</Vazao>
      <Nivel>${l.nivel ?? ""}</Nivel>
      <Chuva>${l.chuva ?? ""}</Chuva>
    </DadosHidrometereologicos>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>
<DataTable xmlns="http://MRCS/">
  <diffgr:diffgram xmlns:msdata="urn:schemas-microsoft-com:xml-msdata" xmlns:diffgr="urn:schemas-microsoft-com:xml-diffgram-v1">
    <DocumentElement xmlns="">
${corpo}
    </DocumentElement>
  </diffgr:diffgram>
</DataTable>`;
}

describe("ANA", () => {
  const xml = xmlAna([
    { t: "2026-11-07 12:00:00", nivel: "569.00", chuva: "0.80" },
    { t: "2026-11-07 11:45:00", nivel: "566.00", chuva: "0.20" },
    { t: "2026-11-07 11:15:00", nivel: "560.00", chuva: "1.00" },
    { t: "2026-11-06 12:00:00", nivel: "402.00", chuva: "0.00" },
    { t: "2026-11-06 11:00:00", nivel: "", chuva: "2.00" },
  ]);

  it("lê o XML em ordem de tempo, com nível em cm e campo vazio como nulo", () => {
    const l = lerXmlAna(xml);
    expect(l.map((x) => x.tempo)).toEqual(["2026-11-06T11:00", "2026-11-06T12:00", "2026-11-07T11:15", "2026-11-07T11:45", "2026-11-07T12:00"]);
    expect(l[0].nivel).toBeNull();
    expect(l[4]).toEqual({ tempo: "2026-11-07T12:00", nivel: 569, chuva: 0.8 });
  });

  it("estação sem dado no período vem como tabela de erro e é recusada", () => {
    expect(() => lerXmlAnaComDados('<DataTable xmlns="http://MRCS/"><ErrorTable><Error>Nenhum dado</Error></ErrorTable></DataTable>')).toThrow();
  });

  it("variação do nível em 24 h: 569 − 402 = +167 cm", () => {
    expect(variacaoNivel(lerXmlAna(xml), 24)).toEqual({ atual: 569, variacao: 167, medidoEm: "2026-11-07T12:00" });
  });

  it("sem leitura perto de 24 h antes, não inventa variação", () => {
    expect(variacaoNivel(lerXmlAna(xml).slice(2), 24)).toBeNull();
  });

  it("chuva de 15 em 15 min cai na hora cheia seguinte, como no Open-Meteo", () => {
    const m = chuvaPorHora(lerXmlAna(xml));
    expect(m.get("2026-11-07T12:00")).toBeCloseTo(2.0);
    expect(m.get("2026-11-06T11:00")).toBe(2);
  });

  it("monta o endereço com datas dd/mm/aaaa no horário de Brasília", () => {
    const u = urlAna("71350001", 3, new Date("2026-11-07T02:00:00Z"));
    expect(u).toContain("dataInicio=04/11/2026");
    expect(u).toContain("dataFim=06/11/2026");
  });
});

describe("INMET e Epagri", () => {
  it("converte a hora UTC para Brasília e leva a pressão ao nível do mar", () => {
    const l = lerJsonInmet(
      JSON.stringify([
        { DT_MEDICAO: "2026-11-06", HR_MEDICAO: "1500", TEM_INS: "21.4", PRE_INS: "906.2", VEN_VEL: "3.1", CHUVA: "0" },
        { DT_MEDICAO: "2026-11-06", HR_MEDICAO: "0200", TEM_INS: null, PRE_INS: "905.0", VEN_VEL: null, CHUVA: "1.2" },
      ]),
      953,
    );
    expect(l[0].tempo).toBe("2026-11-05T23:00");
    expect(l[0].temp).toBeNull();
    expect(l[0].pressao).toBeNull();
    expect(l[1].tempo).toBe("2026-11-06T12:00");
    expect(l[1].pressao!).toBeGreaterThan(1005);
    expect(l[1].pressao!).toBeLessThan(1020);
    expect(l[1].vento).toBe(3.1);
  });

  it("resposta vazia do INMET é recusada", () => {
    expect(() => lerJsonInmet("[]", 900)).toThrow();
  });

  it("o conector da Epagri segue o formato documentado", () => {
    const l = lerJsonEpagri(JSON.stringify([{ dataHora: "2026-11-06T10:00", temperatura: 18, pressao: 900, vento: 2, chuva: 0.4 }]), 1000);
    expect(l[0]).toMatchObject({ tempo: "2026-11-06T10:00", temp: 18, vento: 2, chuva: 0.4 });
  });

  it("pressão ao nível do mar sobe uns 110 hPa a 950 m", () => {
    expect(pressaoNoMar(906, 953, 18)).toBeCloseTo(1014, -1);
  });
});

describe("ONS", () => {
  const csv = readFileSync("tests/dados/ons-reservatorios.csv", "utf8");

  it("lê nível e volume útil só das represas da região", () => {
    const n = lerCsvOns(csv);
    expect(new Set(n.map((x) => x.represa))).toEqual(new Set(REPRESAS.map((r) => r.id)));
    const cn = n.filter((x) => x.represa === "campos-novos").sort((a, b) => a.data.localeCompare(b.data)).at(-1)!;
    expect(cn).toEqual({ represa: "campos-novos", data: "2026-11-06", nivel: 659.34, volume: 86.8 });
  });

  it("recorta o arquivo grande mantendo o cabeçalho", () => {
    const grande = `${csv.split("\n")[0]}\nNE;Nordeste;FIO;JEQUITINHONHA;NORDESTE;JEUITP;ITAPEBI;68;154;2026-01-01;109.35;;35.0\n${csv.split("\n").slice(1).join("\n")}`;
    const r = recortarCsvOns(grande);
    expect(r).not.toContain("ITAPEBI");
    expect(lerCsvOns(r).length).toBe(lerCsvOns(csv).length);
    expect(lerCsvOns(recortarCsvOns(grande, "2026-11-06")).every((n) => n.data >= "2026-11-06")).toBe(true);
    expect(lerCsvOns(recortarCsvOns(grande, "2026-11-06")).length).toBe(4);
  });

  it("variação de 7 dias usa o dia mais perto de uma semana antes", () => {
    const v = variacao7Dias([
      { data: "2026-10-30", nivel: 660 },
      { data: "2026-11-02", nivel: 659 },
      { data: "2026-11-06", nivel: 657.5 },
    ]);
    expect(v?.variacao).toBeCloseTo(-2.5);
    expect(variacao7Dias([{ data: "2026-11-06", nivel: 657 }])).toBeNull();
  });
});

describe("notas de rio e represa", () => {
  it("rio: estável 1; descendo 0,9; subindo 30 cm 0,4; cheia de 1 m 0,1", () => {
    expect(notaRio(5)).toBe(1);
    expect(notaRio(-40)).toBe(0.9);
    expect(notaRio(20)).toBe(0.8);
    expect(notaRio(45)).toBe(0.4);
    expect(notaRio(167)).toBe(0.1);
  });

  it("represa: parada ou subindo 1; queda de 1 a 3 m 0,6; acima de 3 m 0,3", () => {
    expect(notaRepresa(0.5)).toBe(1);
    expect(notaRepresa(-0.5)).toBe(1);
    expect(notaRepresa(-1)).toBe(0.6);
    expect(notaRepresa(-2.9)).toBe(0.6);
    expect(notaRepresa(-3.2)).toBe(0.3);
  });

  it("pesos de rio e represa somam 1 e guardam a proporção pedida, sem a água", () => {
    for (const t of ["acude", "rio", "represa", "rio_truta"] as const) expect(Object.values(PESOS_POR_TIPO[t]).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(PESOS_POR_TIPO.rio.rio).toBeCloseTo(0.1 / 0.7);
    expect(PESOS_POR_TIPO.rio.pressao).toBeCloseTo(0.15 / 0.7);
    expect(PESOS_POR_TIPO.rio.represa).toBe(0);
    expect(PESOS_POR_TIPO.represa.represa).toBeCloseTo(0.1 / 0.7);
    expect(PESOS_POR_TIPO.acude.rio).toBe(0);
  });
});

/** Seis modelos, 2 dias de 24 h a partir de 06/11. A temperatura de cada um é fixa para facilitar a conta. */
function previsaoFalsa(): PrevisaoModelos {
  const tempo = Array.from({ length: 48 }, (_, i) => `2026-11-${i < 24 ? "06" : "07"}T${String(i % 24).padStart(2, "0")}:00`);
  const valores: PrevisaoModelos["valores"] = {};
  MODELO_IDS.forEach((m, k) => {
    valores[m] = {
      temp: tempo.map(() => 10 + k),
      pressao: tempo.map(() => 1010),
      vento: tempo.map(() => 2),
      chuva: tempo.map((_, i) => (k === 5 ? 1 : 0) * (i % 2)),
      nuvens: tempo.map(() => 50),
    };
  });
  return { tempo, valores };
}

describe("vários modelos", () => {
  it("lê a resposta do Open-Meteo separando as variáveis pelo nome do modelo", () => {
    const hourly: Record<string, unknown> = { time: ["2026-11-07T00:00", "2026-11-07T01:00"] };
    for (const m of MODELO_IDS) for (const v of ["temperature_2m", "pressure_msl", "wind_speed_10m", "precipitation", "cloud_cover"]) hourly[`${v}_${m}`] = m === "jma_seamless" ? [null, null] : [1, 2];
    const p = lerModelos(JSON.stringify({ hourly }));
    expect(Object.keys(p.valores)).toHaveLength(5);
    expect(p.valores.ecmwf_ifs!.temp).toEqual([1, 2]);
  });

  it("a melhor combinação que repete outro modelo fica fora da média", () => {
    const p = previsaoFalsa();
    p.valores.best_match = { ...p.valores.ecmwf_ifs! };
    const c = combinar(p, "2026-11-06");
    expect(c.temp[0]).toBeCloseTo((11 + 12 + 13 + 14 + 15) / 5);
    const r = resumoDeHoje(p, "2026-11-06");
    expect(r[0]).toMatchObject({ nome: "Melhor combinação (= ECMWF IFS)", peso: 0 });
    expect(r[1].peso).toBeCloseTo(0.2);
    expect(discordanciaPorDia(p).get("2026-11-06")!.modelos).toBe(5);
  });

  it("sem pesos medidos, a média é simples", () => {
    const c = combinar(previsaoFalsa(), "2026-11-06");
    expect(c.temp[0]).toBeCloseTo(12.5);
  });

  it("com pesos, o modelo que acerta mais manda mais", () => {
    const pesos = { temp: { "1": { best_match: 0.75, ecmwf_ifs: 0.25 } as Partial<Record<ModeloId, number>> } };
    expect(combinar(previsaoFalsa(), "2026-11-06", pesos).temp[0]).toBeCloseTo(0.75 * 10 + 0.25 * 11);
  });

  it("o viés é descontado por faixa, menos na chuva", () => {
    const c = combinar(previsaoFalsa(), "2026-11-06", null, { temp: [1, 1, 2, 1], chuva: [5, 5, 5, 5] });
    expect(c.temp[14]).toBeCloseTo(10.5);
    expect(c.temp[2]).toBeCloseTo(11.5);
    expect(c.chuva[1]).toBeCloseTo(1 / 6);
  });

  it("vento e nuvens nunca ficam fora da faixa possível depois do desconto", () => {
    const c = combinar(previsaoFalsa(), "2026-11-06", null, { vento: [5, 5, 5, 5], nuvens: [-80, -80, -80, -80] });
    expect(c.vento[0]).toBe(0);
    expect(c.nuvens[0]).toBe(100);
  });

  it("antecedência fica entre 1 e 7 dias", () => {
    expect(antecedencia("2026-11-06", "2026-11-06")).toBe(1);
    expect(antecedencia("2026-11-09", "2026-11-06")).toBe(3);
    expect(antecedencia("2026-11-30", "2026-11-06")).toBe(7);
  });

  it("discordância é a diferença entre o maior e o menor modelo", () => {
    const d = discordanciaPorDia(previsaoFalsa()).get("2026-11-06")!;
    expect(d.modelos).toBe(6);
    expect(d.temp).toBeCloseTo(5);
    expect(d.chuva).toBeCloseTo(12);
  });

  it("o resumo de hoje traz cada modelo com peso igual quando não há conferência", () => {
    const r = resumoDeHoje(previsaoFalsa(), "2026-11-06");
    expect(r).toHaveLength(6);
    expect(r[0].peso).toBeCloseTo(1 / 6);
    expect(r[2]).toMatchObject({ nome: "GFS", temp: 12 });
  });

  it("só o futuro é trocado pelos modelos", () => {
    const p = previsaoFalsa();
    const serie: SerieClima = { tempo: p.tempo, temp: p.tempo.map(() => 0), pressao: p.tempo.map(() => 0), vento: p.tempo.map(() => 0), chuva: p.tempo.map(() => 0), nuvens: p.tempo.map(() => 0), codigo: p.tempo.map(() => 0), sol: p.tempo.map(() => 0) };
    const nova = substituirFuturo(serie, p.tempo, combinar(p, "2026-11-06"), "2026-11-06T12:00");
    expect(nova.temp[11]).toBe(0);
    expect(nova.temp[12]).toBeCloseTo(12.5);
    expect(seriesPorModelo(serie, p, "2026-11-06T12:00")[5].temp[30]).toBe(15);
  });
});

describe("conferência da precisão", () => {
  it("faixas de 6 horas: média, soma na chuva e faixa incompleta fora", () => {
    const tempo = Array.from({ length: 10 }, (_, i) => `2026-11-06T${String(i).padStart(2, "0")}:00`);
    expect(agregarFaixas(tempo, tempo.map((_, i) => i), "temp")).toEqual([{ data: "2026-11-06", faixa: 0, valor: 2.5 }]);
    expect(agregarFaixas(tempo, tempo.map(() => 1), "chuva")[0].valor).toBe(6);
    expect(faixaDaHora(23)).toBe(3);
  });

  it("grava a previsão de hoje com a antecedência certa", () => {
    const linhas = linhasDePrevisao("A865", previsaoFalsa(), "2026-11-06");
    expect(new Set(linhas.map((l) => l.antecedencia))).toEqual(new Set([1]));
    expect(linhas.every((l) => l.dataAlvo === "2026-11-07")).toBe(true);
  });

  it("lê a Previous Runs API: previous_day3 vira antecedência 3", () => {
    const time = Array.from({ length: 24 }, (_, i) => `2026-11-05T${String(i).padStart(2, "0")}:00`);
    const texto = JSON.stringify({ hourly: { time, temperature_2m_previous_day3_gfs_seamless: time.map(() => 14) } });
    const l = linhasDeRodadasAnteriores("A865", texto, "2026-11-06");
    expect(l).toHaveLength(4);
    expect(l[0]).toMatchObject({ modelo: "gfs_seamless", variavel: "temp", antecedencia: 3, valor: 14 });
  });

  function pares(origem: string): Par[] {
    const out: Par[] = [];
    for (let d = 1; d <= 15; d++) {
      const data = `2026-10-${String(15 + d).padStart(2, "0")}`;
      for (let f = 0; f < 4; f++) {
        const base = { ponto: "A865", variavel: "temp" as VariavelId, dataAlvo: data, faixa: f, antecedencia: 1, observado: 10, origem };
        out.push({ ...base, modelo: "best_match", previsto: 11 }, { ...base, modelo: "gfs_seamless", previsto: 12 });
      }
    }
    return out;
  }

  it("peso = 1/erro², normalizado: quem erra 1 °C pesa 80%, quem erra 2 °C pesa 20%", () => {
    const r = calcularPrecisao(pares("inmet"), "2026-11-01");
    expect(r.verdade.temp).toBe("observado");
    expect(r.pesos.temp?.["1"]?.best_match).toBeCloseTo(0.8);
    expect(r.pesos.temp?.["1"]?.gfs_seamless).toBeCloseTo(0.2);
    expect(r.erros.find((e) => e.modelo === "combinado")?.mae).toBeCloseTo(1.2);
    expect(r.vies.A865.temp).toEqual([1.2, 1.2, 1.2, 1.2]);
  });

  it("na conferência, a cópia tem erro calculado mas não ganha peso", () => {
    const ps = pares("inmet").flatMap((p) => (p.modelo === "best_match" ? [p, { ...p, modelo: "ecmwf_ifs" }] : [p]));
    const r = calcularPrecisao(ps, "2026-11-01");
    expect(r.copias).toEqual({ best_match: "ecmwf_ifs" });
    expect(r.pesos.temp?.["1"]?.best_match).toBeUndefined();
    expect(r.pesos.temp?.["1"]?.ecmwf_ifs).toBeCloseTo(0.8);
    expect(r.erros.find((e) => e.modelo === "best_match")?.mae).toBeCloseTo(1);
  });

  it("contra estimativa, mostra o erro mas não mexe em peso nem em viés", () => {
    const r = calcularPrecisao(pares("estimado"), "2026-11-01");
    expect(r.verdade.temp).toBe("estimado");
    expect(r.pesos.temp).toBeUndefined();
    expect(r.vies).toEqual({});
    expect(r.erros.find((e) => e.modelo === "best_match")?.mae).toBeCloseTo(1);
  });

  it("fora da janela de 30 dias não conta", () => {
    expect(calcularPrecisao(pares("inmet"), "2026-12-30").erros).toHaveLength(0);
  });
});

describe("observado", () => {
  it("estação 100 m mais baixa mede ar 0,65 °C mais quente", () => {
    expect(corrigirAltitude(20, 900, 1000)).toBeCloseTo(19.35);
    const o = doEstacao([{ tempo: "2026-11-06T10:00", temp: 20, pressao: 1012, vento: 2, chuva: 0 }], 900, 1000);
    expect(o.temp.get("2026-11-06T10:00")).toBeCloseTo(19.35);
  });

  it("chuva de duas estações: a mais perto pesa mais", () => {
    const c = combinarChuva([
      { mapa: new Map([["h", 10]]), km: 5 },
      { mapa: new Map([["h", 0]]), km: 20 },
    ]);
    expect(c.get("h")).toBeCloseTo((10 / 25) / (1 / 25 + 1 / 400));
  });

  it("só o passado vira medição", () => {
    const tempo = ["2026-11-06T10:00", "2026-11-06T11:00", "2026-11-06T12:00"];
    const serie: SerieClima = { tempo, temp: [1, 1, 1], pressao: [1, 1, 1], vento: [1, 1, 1], chuva: [1, 1, 1], nuvens: [1, 1, 1], codigo: [0, 0, 0], sol: [0, 0, 0] };
    const obs = observadoVazio();
    tempo.forEach((t) => obs.temp.set(t, 9));
    const r = aplicarObservado(serie, obs, "2026-11-06T11:00");
    expect(r.serie.temp).toEqual([9, 1, 1]);
    expect(r.horas.temp).toBe(1);
  });

  it("hora cheia de Brasília", () => {
    expect(horaCheiaLocal(new Date("2026-11-07T15:28:00Z"))).toBe("2026-11-07T12:00");
  });
});

describe("estações e represas por local", () => {
  it("Cerro Negro fica perto do lago de Barra Grande, mas a represa escolhida vale mais", () => {
    expect(represaMaisPerto(-27.8, -50.88).id).toBe("barra-grande");
    expect(represaDoLocal({ lat: -27.8, lon: -50.88, represa: "campos-novos" }).id).toBe("campos-novos");
  });

  it("rio usa a estação escolhida; sem escolha, a de nível mais perto a até 40 km", () => {
    expect(estacaoDoRio({ lat: -27.8, lon: -50.88, estacao: "71350001" })?.nome).toBe("Encruzilhada II");
    expect(estacaoDoRio({ lat: -27.8, lon: -50.88 })?.km).toBeLessThan(40);
    expect(estacaoDoRio({ lat: -20, lon: -40 })).toBeNull();
  });

  it("os pontos de conferência são estações do catálogo", () => {
    expect(PONTOS_VERIFICACAO).toEqual(["A865", "A815", "A898"]);
  });
});

describe("estado das fontes", () => {
  const agora = Date.parse("2026-11-07T12:00:00Z");
  const base = { fonte: "ana:71350001:3", nome: "ANA · Encruzilhada II", grupo: "ANA", ultimaTentativa: "2026-11-07T11:00:00Z", dadoDe: null };
  it("ok, atrasada e falhou", () => {
    expect(estadoDaFonte({ ...base, ultimoSucesso: "2026-11-07T10:00:00Z", erro: null }, agora)).toBe("ok");
    expect(estadoDaFonte({ ...base, ultimoSucesso: "2026-11-07T10:00:00Z", erro: "Não respondeu a tempo" }, agora)).toBe("atrasada");
    expect(estadoDaFonte({ ...base, ultimoSucesso: "2026-11-06T10:00:00Z", erro: null }, agora)).toBe("atrasada");
    expect(estadoDaFonte({ ...base, ultimoSucesso: null, erro: "Respondeu 500" }, agora)).toBe("falhou");
  });

  it("a resposta bruta guardada volta igual", () => {
    const t = "<xml>Rio Canoas · nível 569</xml>".repeat(50);
    expect(descomprimir(comprimir(t))).toBe(t);
    expect(comprimir(t).length).toBeLessThan(t.length / 5);
  });
});

/** Um dia de 24 h igual, para ver o efeito só do rio e da represa. */
function serieDeDias(inicio: string, dias: number, temp: number): SerieClima {
  const tempo: string[] = [];
  const d0 = Date.parse(`${inicio}T00:00:00Z`) - 30 * 86_400_000;
  for (let h = 0; h < (dias + 30) * 24; h++) tempo.push(new Date(d0 + h * 3_600_000).toISOString().slice(0, 16));
  const n = tempo.length;
  return { tempo, temp: Array(n).fill(temp), pressao: Array(n).fill(1013), vento: Array(n).fill(2), chuva: Array(n).fill(0), nuvens: Array(n).fill(60), codigo: Array(n).fill(2), sol: Array(n).fill(150) };
}

describe("previsão com rio e represa", () => {
  const comum = { offsetSeg: -10800, hoje: "2026-11-07", agora: new Date("2026-11-07T12:00:00Z"), cenarios: null };
  const rio: Local = { id: "r", nome: "Rio", tipo: "rio", lat: -27.8, lon: -50.88 };
  const represa: Local = { id: "p", nome: "Represa", tipo: "represa", lat: -27.8, lon: -50.88 };

  it("cheia derruba a nota e acende o aviso só hoje e amanhã", () => {
    const serie = serieDeDias("2026-11-07", 9, 24);
    const normal = montarPrevisao({ ...comum, local: rio, locais: [rio], serie, rio: 1 });
    const cheia = montarPrevisao({ ...comum, local: rio, locais: [rio], serie, rio: notaRio(150) });
    expect(cheia.dias[0].bloqueio).toContain("Rio em cheia – cuidado");
    expect(cheia.dias[1].bloqueio).toContain("Rio em cheia – cuidado");
    expect(cheia.dias[2].bloqueio).toBeNull();
    expect(cheia.dias[0].especies.traira.nota!).toBeLessThan(normal.dias[0].especies.traira.nota!);
    expect(cheia.dias[2].especies.traira.nota).toBe(normal.dias[2].especies.traira.nota);
    expect(cheia.dias[0].especies.traira.fatores.rio).toBe(0.1);
  });

  it("represa baixando tira nota em todos os dias; no açude, rio e represa não pesam", () => {
    const serie = serieDeDias("2026-11-07", 9, 24);
    const parada = montarPrevisao({ ...comum, local: represa, locais: [represa], serie, represa: 1 });
    const baixando = montarPrevisao({ ...comum, local: represa, locais: [represa], serie, represa: notaRepresa(-3.5) });
    expect(baixando.dias[5].especies.jundia.nota!).toBeLessThan(parada.dias[5].especies.jundia.nota!);
    const acude: Local = { ...represa, tipo: "acude" };
    const a1 = montarPrevisao({ ...comum, local: acude, locais: [acude], serie, represa: 0.3 });
    const a2 = montarPrevisao({ ...comum, local: acude, locais: [acude], serie, represa: 1 });
    expect(a1.dias[0].especies.jundia.nota).toBe(a2.dias[0].especies.jundia.nota);
  });

  it("modelos que discordam baixam a confiança", () => {
    const serie = serieDeDias("2026-11-07", 9, 24);
    const frio = serieDeDias("2026-11-07", 9, 12);
    const iguais = montarPrevisao({ ...comum, local: rio, locais: [rio], serie, porModelo: [serie, serie, serie] });
    const brigando = montarPrevisao({ ...comum, local: rio, locais: [rio], serie, porModelo: [serie, frio, serie] });
    expect(iguais.dias[1].confianca).toBe("alta");
    expect(brigando.dias[1].confianca).toBe("baixa");
  });
});

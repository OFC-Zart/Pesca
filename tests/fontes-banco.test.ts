import { PGlite } from "@electric-sql/pglite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { LOCAIS_PADRAO } from "@/config/indice";
import * as schema from "@/lib/db/schema";

const pg = new PGlite();
const db = drizzle(pg, { schema });

vi.mock("@/lib/db", () => ({ getDb: () => db }));

const banco = await import("@/lib/fontes/banco");
const { obterFonte, ultimaBruta } = await import("@/lib/fontes/guardar");
const { calcularPrecisao } = await import("@/lib/fontes/precisao");
const { editarLocal, listarLocais } = await import("@/lib/db/consultas");

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(schema.locais).values(LOCAIS_PADRAO.map((l) => ({ ...l })));
});

describe("fontes no banco", () => {
  it("a represa padrão é a da UHE Campos Novos, e dá para trocar a estação do rio", async () => {
    const locais = await listarLocais();
    expect(locais.find((l) => l.id === "represa-cerro-negro")?.represa).toBe("campos-novos");
    await editarLocal("centro-cerro-negro", { estacao: "71540000" });
    expect((await listarLocais()).find((l) => l.id === "centro-cerro-negro")?.estacao).toBe("71540000");
    await editarLocal("centro-cerro-negro", { estacao: null });
  });

  it("medição da estação passa por cima da estimativa, e a estimativa nunca passa por cima da medição", async () => {
    const linhas = Array.from({ length: 12 }, (_, d) => ({
      ponto: "A865",
      modelo: "best_match",
      variavel: "temp" as const,
      dataAlvo: `2026-10-${String(10 + d).padStart(2, "0")}`,
      faixa: 2,
      antecedencia: 1,
      valor: 21,
    }));
    await banco.gravarPrevistas(linhas, "2026-11-01");
    await banco.gravarPrevistas(linhas, "2026-11-01");
    const dias = linhas.map((l) => ({ data: l.dataAlvo, faixa: 2, valor: 19 }));
    await banco.gravarObservadas("A865", "temp", dias, "estimado");
    await banco.gravarObservadas("A865", "temp", dias.map((d) => ({ ...d, valor: 20 })), "inmet");
    await banco.gravarObservadas("A865", "temp", dias, "estimado");

    const pares = await banco.paresDaJanela("2026-11-01", 30);
    expect(pares).toHaveLength(12);
    expect(pares.every((p) => p.origem === "inmet" && p.observado === 20 && p.previsto === 21)).toBe(true);

    const r = calcularPrecisao(pares, "2026-11-01");
    expect(r.verdade.temp).toBe("observado");
    expect(r.vies.A865.temp?.[2]).toBe(1);
    await banco.gravarPrecisao("2026-11-01", r);
    await banco.gravarPrecisao("2026-11-01", r);
    expect((await banco.ultimaPrecisao())?.vies.A865.temp?.[2]).toBe(1);
    expect(await banco.previsoesPassadas("A865", "2026-11-01")).toBe(12);
  });

  it("guarda o nível diário das represas sem duplicar", async () => {
    const n = [
      { represa: "campos-novos", data: "2026-11-05", nivel: 659.4, volume: 87.5 },
      { represa: "campos-novos", data: "2026-11-06", nivel: 659.34, volume: 86.8 },
    ];
    await banco.gravarNiveis(n, "ons");
    await banco.gravarNiveis([{ ...n[1], nivel: 659.3 }], "ons");
    const l = await banco.niveisDaRepresa("campos-novos", "2026-11-07");
    expect(l.map((x) => x.nivel)).toEqual([659.4, 659.3]);
  });

  it("apaga o que passou do prazo e mantém o resto", async () => {
    const r = await banco.limparAntigos("2027-01-05");
    expect(r.previsoesModelos).toBe(12);
    expect(r.observacoes).toBe(0);
  });

  it("fonte de observação: busca na primeira vez, guarda a resposta bruta e reusa até vencer", async () => {
    let chamadas = 0;
    const buscar = async () => {
      chamadas++;
      return { ok: true, status: 200, texto: "<x>569</x>", tipo: "text/xml", obtidoEm: new Date() };
    };
    const o = { fonte: "teste:rio", nome: "Teste · rio", grupo: "Teste", validadeSeg: 3600, buscar, ler: (t: string) => Number(t.match(/\d+/)![0]) };
    const a = await obterFonte(o);
    expect(a).toMatchObject({ dados: 569, estado: "ok" });
    const b = await obterFonte(o);
    expect(b.dados).toBe(569);
    expect(chamadas).toBe(1);
    expect((await ultimaBruta("teste:rio"))?.texto).toBe("<x>569</x>");
    const [st] = await db.select().from(schema.fontesStatus).where(eq(schema.fontesStatus.fonte, "teste:rio"));
    expect(st.erro).toBeNull();
    expect(st.ultimoSucesso).not.toBeNull();
  });

  it("fonte que falha: anota o erro e o índice segue sem ela", async () => {
    const o = {
      fonte: "teste:fora",
      nome: "Teste · fora",
      grupo: "Teste",
      validadeSeg: 3600,
      buscar: async () => ({ ok: false, status: 503, texto: "", tipo: "", obtidoEm: new Date() }),
      ler: (t: string) => t,
    };
    const r = await obterFonte(o);
    expect(r).toEqual({ dados: null, estado: "falhou", obtidoEm: null });
    await new Promise((ok) => setTimeout(ok, 50));
    const [st] = await db.select().from(schema.fontesStatus).where(eq(schema.fontesStatus.fonte, "teste:fora"));
    expect(st.erro).toContain("503");
    expect(st.ultimoSucesso).toBeNull();
  });
});

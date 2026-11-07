import { randomUUID } from "node:crypto";
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

const { gravarSaida, limparPrevisoesAntigas, listarLocais, listarSaidas, recalibrarLocal } = await import("@/lib/db/consultas");

const entrada = (extra = {}) => ({
  clienteId: randomUUID(),
  data: "2026-11-06",
  inicio: "06:00",
  fim: "09:00",
  localId: "centro-cerro-negro",
  especieAlvo: "traira",
  capturas: [{ especie: "traira", quantidade: 2 }],
  ...extra,
});

beforeAll(async () => {
  await migrate(db, { migrationsFolder: "./drizzle" });
  await db.insert(schema.locais).values(LOCAIS_PADRAO.map((l) => ({ ...l })));
});

describe("banco", () => {
  it("as migrações criam as tabelas e os locais iniciais aparecem", async () => {
    const locais = await listarLocais();
    expect(locais.map((l) => l.id)).toContain("centro-cerro-negro");
    expect(locais[0].calibA).toBeNull();
  });

  it("grava e lista a pescaria com capturas e nota", async () => {
    const s = entrada();
    expect(await gravarSaida(s, { nota: 63, fatores: { agua: 1 }, aguaModelo: 18 })).toEqual({ duplicada: false });
    const lista = await listarSaidas();
    const achada = lista!.find((x) => x.clienteId === s.clienteId)!;
    expect(achada.nota).toBe(63);
    expect(achada.capturas).toEqual([{ especie: "traira", quantidade: 2 }]);
  });

  it("não duplica quando o aparelho reenvia", async () => {
    const s = entrada();
    await gravarSaida(s, { nota: null, fatores: null, aguaModelo: null });
    expect(await gravarSaida(s, { nota: null, fatores: null, aguaModelo: null })).toEqual({ duplicada: true });
    const caps = await db.select().from(schema.capturas);
    expect(caps.filter((c) => c.quantidade === 2).length).toBeGreaterThan(0);
    const lista = await listarSaidas();
    expect(lista!.filter((x) => x.clienteId === s.clienteId)).toHaveLength(1);
  });

  it("saída zerada é gravada sem capturas", async () => {
    const s = entrada({ capturas: [] });
    await gravarSaida(s, { nota: null, fatores: null, aguaModelo: null });
    const lista = await listarSaidas();
    expect(lista!.find((x) => x.clienteId === s.clienteId)!.capturas).toEqual([]);
  });

  it("calibra o local a partir de 3 medições, e com a reta quando há 10 em épocas diferentes", async () => {
    const localId = "acude-cerro-negro";
    const registrar = (x: number, y: number) => gravarSaida(entrada({ localId, tempAgua: y }), { nota: null, fatores: null, aguaModelo: x });
    const ver = async () => (await db.select().from(schema.locais).where(eq(schema.locais.id, localId)))[0];

    await registrar(10, 11);
    await registrar(11, 12);
    expect((await ver()).calibA).toBeNull();

    await registrar(12, 13);
    let l = await ver();
    expect(l.calibN).toBe(3);
    expect(l.calibA!).toBeCloseTo(1, 3);
    expect(l.calibB!).toBe(1);

    for (let i = 0; i < 7; i++) await registrar(13 + i * 2, 2 + 0.9 * (13 + i * 2));
    l = await ver();
    expect(l.calibN).toBe(10);
    expect(l.calibB!).not.toBe(1);
    expect(l.calibB!).toBeGreaterThan(0.5);
    expect(l.calibB!).toBeLessThan(1.5);

    await recalibrarLocal(localId);
    expect((await ver()).calibB!).toBeCloseTo(l.calibB!, 5);
  });

  it("ignora medição sem a saída do modelo", async () => {
    const localId = "represa-cerro-negro";
    await gravarSaida(entrada({ localId, tempAgua: 20 }), { nota: null, fatores: null, aguaModelo: null });
    const [l] = await db.select().from(schema.locais).where(eq(schema.locais.id, localId));
    expect(l.calibN).toBe(0);
  });

  it("limpeza apaga só previsões com mais de 90 dias e mantém as pescarias", async () => {
    const linha = (criadoEm: string) => ({ dataAlvo: criadoEm, criadoEm, localId: "centro-cerro-negro", especie: "traira", nota: 50 });
    const antes = (await listarSaidas())!.length;
    await db.insert(schema.previsoes).values([linha("2026-08-07"), linha("2026-08-08"), linha("2026-11-06")]);

    expect(await limparPrevisoesAntigas("2026-11-06")).toBe(1);

    const restantes = await db.select().from(schema.previsoes);
    expect(restantes.map((r) => r.criadoEm).sort()).toEqual(["2026-08-08", "2026-11-06"]);
    expect((await listarSaidas())!.length).toBe(antes);
  });

  it("rejeita local inexistente", async () => {
    await expect(gravarSaida(entrada({ localId: "nao-existe" }), { nota: null, fatores: null, aguaModelo: null })).rejects.toThrow();
  });
});

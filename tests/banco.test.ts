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

const { gravarSaida, listarLocais, listarSaidas, recalibrarLocal } = await import("@/lib/db/consultas");

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
    expect(await gravarSaida(s, { nota: 63, fatores: { agua: 1 }, mediaAr: 18 })).toEqual({ duplicada: false });
    const lista = await listarSaidas();
    const achada = lista!.find((x) => x.clienteId === s.clienteId)!;
    expect(achada.nota).toBe(63);
    expect(achada.capturas).toEqual([{ especie: "traira", quantidade: 2 }]);
  });

  it("não duplica quando o aparelho reenvia", async () => {
    const s = entrada();
    await gravarSaida(s, { nota: null, fatores: null, mediaAr: null });
    expect(await gravarSaida(s, { nota: null, fatores: null, mediaAr: null })).toEqual({ duplicada: true });
    const caps = await db.select().from(schema.capturas);
    expect(caps.filter((c) => c.quantidade === 2).length).toBeGreaterThan(0);
    const lista = await listarSaidas();
    expect(lista!.filter((x) => x.clienteId === s.clienteId)).toHaveLength(1);
  });

  it("saída zerada é gravada sem capturas", async () => {
    const s = entrada({ capturas: [] });
    await gravarSaida(s, { nota: null, fatores: null, mediaAr: null });
    const lista = await listarSaidas();
    expect(lista!.find((x) => x.clienteId === s.clienteId)!.capturas).toEqual([]);
  });

  it("calibra o local só a partir de 10 medições", async () => {
    const localId = "acude-cerro-negro";
    for (let i = 0; i < 9; i++) {
      await gravarSaida(entrada({ localId, tempAgua: 2 + 0.9 * (10 + i) }), { nota: null, fatores: null, mediaAr: 10 + i });
    }
    let [l] = await db.select().from(schema.locais).where(eq(schema.locais.id, localId));
    expect(l.calibN).toBe(9);
    expect(l.calibA).toBeNull();

    await gravarSaida(entrada({ localId, tempAgua: 2 + 0.9 * 25 }), { nota: null, fatores: null, mediaAr: 25 });
    [l] = await db.select().from(schema.locais).where(eq(schema.locais.id, localId));
    expect(l.calibN).toBe(10);
    expect(l.calibA!).toBeCloseTo(2, 3);
    expect(l.calibB!).toBeCloseTo(0.9, 3);

    await recalibrarLocal(localId);
    const [denovo] = await db.select().from(schema.locais).where(eq(schema.locais.id, localId));
    expect(denovo.calibB!).toBeCloseTo(0.9, 3);
  });

  it("ignora medição sem média do ar na regressão", async () => {
    const localId = "represa-cerro-negro";
    await gravarSaida(entrada({ localId, tempAgua: 20 }), { nota: null, fatores: null, mediaAr: null });
    const [l] = await db.select().from(schema.locais).where(eq(schema.locais.id, localId));
    expect(l.calibN).toBe(0);
  });

  it("rejeita local inexistente", async () => {
    await expect(gravarSaida(entrada({ localId: "nao-existe" }), { nota: null, fatores: null, mediaAr: null })).rejects.toThrow();
  });
});

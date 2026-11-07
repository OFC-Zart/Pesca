import { describe, expect, it } from "vitest";
import { momentoDoDia, posicaoNoCeu, quantasNuvens, tempoDoDia } from "@/lib/cena";

const sol = { nascerSol: 5.5, porSol: 18.75 };

describe("céu do cartão", () => {
  it("acompanha o nascer e o pôr do sol reais", () => {
    expect(momentoDoDia(3, sol)).toBe("noite");
    expect(momentoDoDia(4.5, sol)).toBe("amanhecer");
    expect(momentoDoDia(6.4, sol)).toBe("amanhecer");
    expect(momentoDoDia(6.5, sol)).toBe("dia");
    expect(momentoDoDia(12, sol)).toBe("dia");
    expect(momentoDoDia(17.75, sol)).toBe("entardecer");
    expect(momentoDoDia(19.7, sol)).toBe("entardecer");
    expect(momentoDoDia(19.75, sol)).toBe("noite");
    expect(momentoDoDia(23.9, sol)).toBe("noite");
  });

  it("sem dado do sol, usa 6h e 18h", () => {
    expect(momentoDoDia(12, { nascerSol: null, porSol: null })).toBe("dia");
    expect(momentoDoDia(2, { nascerSol: null, porSol: null })).toBe("noite");
  });

  it("o sol sobe, chega ao alto no meio do dia e desce", () => {
    const manha = posicaoNoCeu(7, sol);
    const meio = posicaoNoCeu((5.5 + 18.75) / 2, sol);
    const tarde = posicaoNoCeu(17, sol);
    expect(meio.deNoite).toBe(false);
    expect(meio.topo).toBeLessThan(manha.topo);
    expect(meio.topo).toBeLessThan(tarde.topo);
    expect(manha.esquerda).toBeLessThan(meio.esquerda);
    expect(meio.esquerda).toBeLessThan(tarde.esquerda);
  });

  it("a lua atravessa a noite inteira, inclusive depois da meia-noite", () => {
    const antes = posicaoNoCeu(21, sol);
    const depois = posicaoNoCeu(2, sol);
    expect(antes.deNoite).toBe(true);
    expect(depois.deNoite).toBe(true);
    expect(antes.esquerda).toBeLessThan(depois.esquerda);
  });

  it("a posição nunca sai do cartão", () => {
    for (let h = 0; h < 24; h += 0.25) {
      const p = posicaoNoCeu(h, sol);
      expect(p.esquerda).toBeGreaterThanOrEqual(10);
      expect(p.esquerda).toBeLessThanOrEqual(88);
      expect(p.topo).toBeGreaterThanOrEqual(10);
      expect(p.topo).toBeLessThanOrEqual(40);
    }
  });
});

describe("tempo do dia", () => {
  it("chuva tem prioridade, depois a cobertura de nuvens", () => {
    expect(tempoDoDia({ nuvens: 5, chuva48h: 20 })).toBe("chuva");
    expect(tempoDoDia({ nuvens: 90, chuva48h: 0 })).toBe("nublado");
    expect(tempoDoDia({ nuvens: 50, chuva48h: 0 })).toBe("poucas-nuvens");
    expect(tempoDoDia({ nuvens: 10, chuva48h: 0 })).toBe("limpo");
  });
  it("mais nuvens no céu, mais nuvens no desenho", () => {
    expect([0, 30, 60, 95].map(quantasNuvens)).toEqual([0, 1, 2, 3]);
  });
});

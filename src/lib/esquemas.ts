import { z } from "zod";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido");

export const esquemaSaida = z.object({
  clienteId: z.uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  inicio: hora,
  fim: hora,
  localId: z.string().min(1).max(80),
  especieAlvo: z.string().min(1).max(40),
  isca: z.string().trim().max(80).optional(),
  apelido: z.string().trim().max(40).optional(),
  tempAgua: z.number().min(0).max(45).optional(),
  capturas: z
    .array(z.object({ especie: z.string().min(1).max(40), quantidade: z.number().int().min(1).max(500) }))
    .max(20),
}).refine((s) => s.inicio !== s.fim, { message: "Início e fim iguais", path: ["fim"] });

export type EntradaSaida = z.infer<typeof esquemaSaida>;

export const esquemaLocal = z.object({
  nome: z.string().trim().min(2).max(80),
  tipo: z.enum(["rio", "acude", "represa", "rio_truta"]),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

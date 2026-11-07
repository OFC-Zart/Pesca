import { z } from "zod";
import { PEIXE_IDS } from "@/config/peixes";

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido");

export const esquemaSaida = z.object({
  clienteId: z.uuid(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  inicio: hora,
  fim: hora,
  localId: z.string().min(1).max(80),
  especieAlvo: z.string().min(1).max(40),
  isca: z.string().trim().max(80).optional(),
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

const campoNome = z.string().trim().min(2, "Nome muito curto.").max(30, "Nome muito longo.");
const campoIcone = z.enum(PEIXE_IDS, { message: "Escolha uma fotinha da lista." });

export const esquemaCadastro = z.object({
  nome: campoNome,
  usuario: z.string().trim().toLowerCase().regex(/^[a-z0-9._]{3,20}$/, "Usuário: 3 a 20 letras ou números, sem espaço nem acento."),
  senha: z.string().min(6, "A senha precisa de pelo menos 6 caracteres.").max(100, "Senha muito longa."),
  icone: campoIcone,
  codigo: z.string().max(200),
});

export const esquemaEntrar = z.object({
  usuario: z.string().trim().toLowerCase().max(40),
  senha: z.string().max(100),
});

export const esquemaPerfil = z.object({ nome: campoNome, icone: campoIcone });

/** Fotinhas da turma: ilustrações em domínio público (CC0). Créditos em assets/peixes-CREDITOS.md. */
export const PEIXES = [
  { id: "tubarao-malandro", nome: "Tubarão Malandro" },
  { id: "tubarao-vaca", nome: "Tubarão Vaca" },
  { id: "piranha-pescadora", nome: "Piranha Pescadora" },
  { id: "zerou-de-novo", nome: "Zerou de Novo" },
  { id: "virou-janta", nome: "Virou Janta" },
  { id: "feio-de-dar-do", nome: "Feio de Dar Dó" },
  { id: "olho-gordo", nome: "Olho Gordo" },
  { id: "peixe-bobao", nome: "Peixe Bobão" },
  { id: "cara-de-bobo", nome: "Cara de Bobo" },
  { id: "peixe-arrotao", nome: "Arrotão" },
  { id: "peixe-doidao", nome: "Doidão" },
  { id: "palhaco-da-turma", nome: "Palhaço da Turma" },
  { id: "morto-de-fome", nome: "Morto de Fome" },
  { id: "peixe-fofoqueiro", nome: "Fofoqueiro" },
  { id: "mal-humorado", nome: "Mal-Humorado" },
  { id: "peixe-chocado", nome: "Chocado" },
  { id: "apaixonado", nome: "Apaixonado" },
  { id: "baiacu-estufado", nome: "Baiacu Estufado" },
  { id: "piranha-sorriso", nome: "Piranha Sorriso" },
  { id: "tubarao-gente-boa", nome: "Tubarão Gente Boa" },
  { id: "tubarao-bravo", nome: "Tubarão Bravo" },
  { id: "vermelhao", nome: "Vermelhão" },
] as const;

export type PeixeId = (typeof PEIXES)[number]["id"];
export const PEIXE_IDS = PEIXES.map((p) => p.id) as [PeixeId, ...PeixeId[]];
export const PEIXE_PADRAO: PeixeId = "peixe-bobao";

export function nomeDoPeixe(id: string): string {
  return PEIXES.find((p) => p.id === id)?.nome ?? "Peixe";
}

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// A senha nunca é guardada: só o resultado do scrypt, que é caro de reverter de propósito.
const N = 32768;
const R = 8;
const P = 1;
const TAMANHO = 32;
const MEMORIA_MAX = 64 * 1024 * 1024;

function derivar(senha: string, sal: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha.normalize("NFKC"), sal, TAMANHO, { N: n, r, p, maxmem: MEMORIA_MAX }, (err, chave) => {
      if (err) reject(err);
      else resolve(chave);
    });
  });
}

export async function gerarHashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const hash = await derivar(senha, sal, N, R, P);
  return `scrypt$${N}$${R}$${P}$${sal.toString("hex")}$${hash.toString("hex")}`;
}

export async function conferirSenha(senha: string, guardado: string): Promise<boolean> {
  const [algoritmo, n, r, p, sal, hash] = guardado.split("$");
  if (algoritmo !== "scrypt" || !sal || !hash) return false;
  const esperado = Buffer.from(hash, "hex");
  const calculado = await derivar(senha, Buffer.from(sal, "hex"), Number(n), Number(r), Number(p));
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado);
}

// Gera public/topo.svg (curvas de nível) e os ícones do PWA. Para trocar o logo, substitua assets/logo-original.png e rode: node scripts/gerar-arte.mjs
import { writeFileSync } from "node:fs";
import sharp from "sharp";

// Ruído suave determinístico, para o desenho não mudar entre execuções.
function ruido(x, y) {
  let v = 0;
  for (const [f, a, px, py] of [
    [0.9, 1, 1.3, 4.1], [1.7, 0.55, 2.2, 0.7], [3.1, 0.3, 5.5, 3.3], [5.3, 0.14, 0.4, 7.9],
  ]) {
    v += a * Math.sin(f * x + px + Math.sin(f * 0.7 * y + py)) * Math.cos(f * y + py * 0.5 + Math.sin(f * 0.6 * x));
  }
  return v;
}

function curvas(w, h, passo, niveis) {
  const nx = Math.ceil(w / passo);
  const ny = Math.ceil(h / passo);
  const campo = [];
  for (let j = 0; j <= ny; j++) {
    campo.push([]);
    for (let i = 0; i <= nx; i++) campo[j].push(ruido((i * passo) / 190, (j * passo) / 190));
  }
  let d = "";
  const r = (n) => Math.round(n * 10) / 10;
  const borda = (a, b, va, vb, n) => a + ((n - va) / (vb - va)) * (b - a);
  for (const n of niveis) {
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const [a, b, c, e] = [campo[j][i], campo[j][i + 1], campo[j + 1][i + 1], campo[j + 1][i]];
        const x = i * passo;
        const y = j * passo;
        const pts = [];
        if (a < n !== b < n) pts.push([borda(x, x + passo, a, b, n), y]);
        if (b < n !== c < n) pts.push([x + passo, borda(y, y + passo, b, c, n)]);
        if (e < n !== c < n) pts.push([borda(x, x + passo, e, c, n), y + passo]);
        if (a < n !== e < n) pts.push([x, borda(y, y + passo, a, e, n)]);
        for (let k = 0; k + 1 < pts.length; k += 2) {
          d += `M${r(pts[k][0])} ${r(pts[k][1])}L${r(pts[k + 1][0])} ${r(pts[k + 1][1])}`;
        }
      }
    }
  }
  return d;
}

const niveis = Array.from({ length: 13 }, (_, i) => -1.5 + i * 0.25);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200"><path d="${curvas(1200, 1200, 20, niveis)}" fill="none" stroke="#7d9650" stroke-width="1"/></svg>`;
writeFileSync("public/topo.svg", svg);
console.log("topo.svg", (svg.length / 1024).toFixed(0), "KB");

// O logo oficial tem fundo preto: o preto vira transparência para a arte assentar no tema.
async function recortar([x0, y0, x1, y1]) {
  const { data, info } = await sharp("assets/logo-original.png")
    .extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const px = Buffer.alloc(info.width * info.height * 4);
  for (let k = 0; k < info.width * info.height; k++) {
    const [r, g, b] = [data[k * 3], data[k * 3 + 1], data[k * 3 + 2]];
    const t = Math.min(1, Math.max(0, (Math.max(r, g, b) - 36) / 44));
    px.set([r, g, b, Math.round(t * t * (3 - 2 * t) * 255)], k * 4);
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png();
}

const SIMBOLO = [60, 40, 575, 376];
const NOME = [40, 378, 595, 482];
const COMPLETO = [40, 40, 595, 534];

await (await recortar(SIMBOLO)).toFile("public/logo-simbolo.png");
await (await recortar(NOME)).toFile("public/logo-nome.png");
await (await recortar(COMPLETO)).toFile("public/logo-completo.png");

const simbolo = await (await recortar(SIMBOLO)).toBuffer();
for (const [nome, tam, margem] of [["icon-192", 192, 0.08], ["icon-512", 512, 0.08], ["maskable-512", 512, 0.2], ["apple-touch", 180, 0.08], ["favicon", 64, 0.02]]) {
  const interno = Math.round(tam * (1 - margem * 2));
  const m = await sharp(simbolo).resize(interno, interno, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: tam, height: tam, channels: 4, background: "#0b0f0a" } })
    .composite([{ input: m, gravity: "center" }])
    .png()
    .toFile(`public/icons/${nome}.png`);
}
console.log("logo e ícones gerados");

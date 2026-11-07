// Deixa o site abrir sem sinal na beira do rio.
const CACHE = "idfish-v5";
const PAGINAS = ["/", "/registrar", "/historico", "/como-funciona", "/perfil", "/locais"];

self.addEventListener("install", (e) => {
  e.waitUntil(guardarTudo().then(() => self.skipWaiting()));
});

// Guarda as páginas e os arquivos que elas usam, para o site abrir sem sinal já depois da primeira visita.
async function guardarTudo() {
  const cache = await caches.open(CACHE);
  const arquivos = new Set(["/topo.svg", "/logo-simbolo.png", "/logo-nome.png", "/logo-completo.png"]);
  await Promise.all(
    PAGINAS.map(async (p) => {
      const r = await fetch(p);
      if (!r.ok || r.redirected) return;
      await cache.put(p, r.clone());
      for (const m of (await r.text()).matchAll(/\/_next\/static\/[^"'\\\s<>)]+/g)) arquivos.add(m[0]);
    }),
  );
  await Promise.allSettled([...arquivos].map((a) => cache.add(a)));
}

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

async function redePrimeiro(req) {
  const cache = await caches.open(CACHE);
  try {
    const r = await fetch(req);
    if (r.ok && !r.redirected) cache.put(req, r.clone());
    return r;
  } catch (err) {
    const salvo = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (salvo) return salvo;
    if (req.mode === "navigate") {
      const inicio = await cache.match("/");
      if (inicio) return inicio;
    }
    throw err;
  }
}

async function cachePrimeiro(req) {
  const cache = await caches.open(CACHE);
  const salvo = await cache.match(req);
  if (salvo) return salvo;
  const r = await fetch(req);
  if (r.ok) cache.put(req, r.clone());
  return r;
}

self.addEventListener("fetch", (e) => {
  const { request: req } = e;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/peixes/") || url.pathname === "/topo.svg" || url.pathname.startsWith("/logo-")) {
    e.respondWith(cachePrimeiro(req));
  } else if (req.mode === "navigate" || url.pathname === "/api/locais") {
    e.respondWith(redePrimeiro(req));
  }
  // A previsão já fica guardada pelo próprio app, com aviso de quando foi atualizada.
});

export function TituloPagina({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <header className="mb-5">
      <h1 className="font-display text-5xl font-black uppercase leading-[0.95] tracking-tight">{titulo}</h1>
      {sub && <p className="mt-2 max-w-2xl text-osso/80">{sub}</p>}
    </header>
  );
}

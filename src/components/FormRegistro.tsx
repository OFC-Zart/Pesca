"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { CheckCircle2, Minus, Plus } from "lucide-react";
import { ESPECIES, ESPECIE_IDS, LOCAIS_PADRAO, OUTRAS_CAPTURAS } from "@/config/indice";
import { prefs, registrarSaida } from "@/lib/armazem";
import { esquemaSaida } from "@/lib/esquemas";
import { agoraEmCerroNegro } from "@/lib/formato";
import type { Local } from "@/lib/indice/tipos";

const CAPTURAVEIS = [
  ...ESPECIE_IDS.map((id) => ({ id: id as string, nome: ESPECIES[id].nome })),
  ...OUTRAS_CAPTURAS.map((n) => ({ id: n as string, nome: n as string })),
];

type Resultado = "ok" | "sem-banco" | "falha";

export function FormRegistro() {
  const [locais, setLocais] = useState<Local[]>(LOCAIS_PADRAO.map((l) => ({ ...l })));
  const [data, setData] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [localId, setLocalId] = useState<string>(LOCAIS_PADRAO[0].id);
  const [especieAlvo, setEspecieAlvo] = useState<string>(ESPECIE_IDS[0]);
  const [isca, setIsca] = useState("");
  const [tempAgua, setTempAgua] = useState("");
  const [capturas, setCapturas] = useState<Record<string, number>>({});
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    const a = agoraEmCerroNegro();
    setData(a.data);
    setFim(a.horaTexto);
    setInicio(`${String(Math.max(0, a.hora - 2)).padStart(2, "0")}:${String(a.minuto).padStart(2, "0")}`);
    const salvo = prefs.local();
    if (salvo) setLocalId(salvo);
    const e = prefs.especie();
    if (e && e in ESPECIES) setEspecieAlvo(e);
    fetch("/api/locais")
      .then((r) => r.json())
      .then((j) => j.locais && setLocais(j.locais))
      .catch(() => {});
  }, []);

  const mudar = (id: string, delta: number) =>
    setCapturas((c) => ({ ...c, [id]: Math.max(0, Math.min(500, (c[id] ?? 0) + delta)) }));

  const total = Object.values(capturas).reduce((a, b) => a + b, 0);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setErro(null);
    const temp = tempAgua.trim() ? Number(tempAgua.replace(",", ".")) : undefined;
    const parsed = esquemaSaida.safeParse({
      clienteId: crypto.randomUUID(),
      data,
      inicio,
      fim,
      localId,
      especieAlvo,
      isca: isca.trim() || undefined,
      tempAgua: temp,
      capturas: Object.entries(capturas)
        .filter(([, q]) => q > 0)
        .map(([especie, quantidade]) => ({ especie, quantidade })),
    });
    if (!parsed.success) {
      const campo = parsed.error.issues[0];
      setErro(campo?.path[0] === "tempAgua" ? "A temperatura da água precisa ser um número entre 0 e 45." : (campo?.message ?? "Confira os campos."));
      return;
    }
    setEnviando(true);
    setResultado(await registrarSaida(parsed.data));
    setEnviando(false);
  }

  if (resultado) {
    return (
      <div className="painel aparece mx-auto max-w-lg p-6 text-center">
        <CheckCircle2 size={44} className="mx-auto text-broto" aria-hidden />
        <h2 className="mt-3 font-display text-3xl font-extrabold uppercase">{total === 0 ? "Zerou, mas conta!" : `${total} ${total === 1 ? "peixe anotado" : "peixes anotados"}`}</h2>
        <p className="mt-2 text-sm text-osso/85">
          {resultado === "ok" && "Pescaria salva com o clima do dia. Cada registro deixa o índice mais certeiro para Cerro Negro."}
          {resultado === "sem-banco" && "Salva neste aparelho. O diário compartilhado ainda não está ligado."}
          {resultado === "falha" && "Salva neste aparelho. Ela será enviada quando o sinal voltar."}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Link href="/historico" className="flex min-h-12 items-center rounded-lg bg-folha px-4 font-semibold">
            Ver histórico
          </Link>
          <button
            onClick={() => {
              setResultado(null);
              setCapturas({});
              setTempAgua("");
            }}
            className="min-h-12 rounded-lg border border-osso/20 px-4 font-semibold"
          >
            Registrar outra
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mx-auto grid max-w-3xl grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2 lg:gap-x-8">
      <fieldset className="grid content-start gap-4">
        <legend className="rotulo mb-3">A saída</legend>
        <label className="grid gap-1 text-sm font-medium">
          Data
          <input type="date" required value={data} onChange={(e) => setData(e.target.value)} className="campo" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Começou
            <input type="time" required value={inicio} onChange={(e) => setInicio(e.target.value)} className="campo" />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Terminou
            <input type="time" required value={fim} onChange={(e) => setFim(e.target.value)} className="campo" />
          </label>
        </div>
        <label className="grid gap-1 text-sm font-medium">
          Local
          <select value={localId} onChange={(e) => setLocalId(e.target.value)} className="campo">
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Peixe que você foi buscar
          <select value={especieAlvo} onChange={(e) => setEspecieAlvo(e.target.value)} className="campo">
            {ESPECIE_IDS.map((id) => (
              <option key={id} value={id}>
                {ESPECIES[id].nome}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Isca <span className="font-normal text-pedra">(opcional)</span>
          <input value={isca} maxLength={80} onChange={(e) => setIsca(e.target.value)} placeholder="Minhoca, milho, artificial…" className="campo" />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Temperatura da água medida <span className="font-normal text-pedra">(°C, opcional)</span>
          <input inputMode="decimal" value={tempAgua} onChange={(e) => setTempAgua(e.target.value)} placeholder="Só se usou termômetro" className="campo" />
        </label>
      </fieldset>

      <fieldset className="content-start">
        <legend className="rotulo mb-3">O que veio</legend>
        <p className="mb-3 text-sm text-pedra">Não pegou nada? Registre mesmo assim: dia zerado também ensina o índice.</p>
        <ul className="painel divide-y divide-osso/8 overflow-hidden">
          {CAPTURAVEIS.map(({ id, nome }) => {
            const q = capturas[id] ?? 0;
            return (
              <li key={id} className="flex min-h-14 items-center justify-between gap-2 pl-3.5 pr-2">
                <span className={q > 0 ? "font-semibold" : ""}>{nome}</span>
                <span className="flex items-center gap-1">
                  <button type="button" aria-label={`Menos ${nome}`} disabled={q === 0} onClick={() => mudar(id, -1)} className="grid size-11 place-items-center rounded-lg text-pedra disabled:opacity-30">
                    <Minus size={18} aria-hidden />
                  </button>
                  <span className="w-7 text-center font-display text-2xl font-extrabold" aria-live="polite">
                    {q}
                  </span>
                  <button type="button" aria-label={`Mais ${nome}`} onClick={() => mudar(id, 1)} className="grid size-11 place-items-center rounded-lg bg-folha text-brotinho">
                    <Plus size={18} aria-hidden />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
        {erro && (
          <p role="alert" className="mt-3 rounded-lg border border-boia bg-sangue px-3 py-2 text-sm">
            {erro}
          </p>
        )}
        <button disabled={enviando} className="mt-4 min-h-14 w-full rounded-xl bg-boia text-base font-bold text-white transition-colors hover:bg-boia-clara disabled:opacity-60">
          {enviando ? "Salvando…" : "Salvar pescaria"}
        </button>
      </fieldset>
    </form>
  );
}

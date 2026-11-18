"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { desativarAcessoAction, salvarAcessoAction, salvarConfigAction, salvarLojaAction } from "@/lib/rede/actions";
import { lerNumero } from "@/lib/rede/csv";
import type { AcessoLinha, MembroLinha } from "@/lib/rede/loader";
import { slugDe } from "@/lib/rede/texto";
import { MODULOS_COLABORADOR, PAPEL_LABEL, type CanaisLoja, type ConfigRede, type Loja, type PapelRede, type StatusLoja } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
const paraTexto = (n: number) => String(n).replace(".", ",");

const STATUS_LABEL: Record<StatusLoja, string> = { operando: "Em operação", inauguracao: "Em inauguração", inativa: "Inativa" };
const CANAIS_LABEL: Record<CanaisLoja, string> = { "salao+delivery": "Salão e delivery", delivery: "Só delivery", salao: "Só salão" };

/* ============================================================ lojas */

export function LojasGestao({ slug, lojas }: { slug: string; lojas: Loja[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editando, setEditando] = useState<Loja | null>(null);
  const [nome, setNome] = useState("");
  const [identificador, setIdentificador] = useState("");
  const [status, setStatus] = useState<StatusLoja>("operando");
  const [canais, setCanais] = useState<CanaisLoja>("salao+delivery");
  const [inauguracao, setInauguracao] = useState("");
  const [prevista, setPrevista] = useState("");
  const [ordem, setOrdem] = useState("");

  const preencher = (l: Loja | null) => {
    setEditando(l);
    setNome(l?.nome ?? "");
    setIdentificador(l?.slug ?? "");
    setStatus(l?.status ?? "operando");
    setCanais(l?.canais ?? "salao+delivery");
    setInauguracao(l?.dataInauguracao ?? "");
    setPrevista(l?.inauguracaoPrevista ?? "");
    setOrdem(l ? String(l.ordem) : String((lojas.reduce((m, x) => Math.max(m, x.ordem), 0) || 0) + 1));
    setMsg(null);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    iniciar(async () => {
      const r = await salvarLojaAction(slug, {
        id: editando?.id,
        nome,
        slug: editando ? editando.slug : identificador || slugDe(nome),
        status,
        canais,
        dataInauguracao: inauguracao || null,
        inauguracaoPrevista: prevista || null,
        ordem: Number(ordem) || 0,
      });
      if (r.success) {
        setMsg({ tipo: "success", texto: editando ? "Loja atualizada." : "Loja cadastrada." });
        preencher(null);
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  return (
    <SectionCard title="Lojas" description="Lojas inativas somem dos painéis, mas todo o histórico delas continua guardado.">
      <div className="space-y-4">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Loja</th>
                <th className="py-2 pr-3 font-medium">Situação</th>
                <th className="py-2 pr-3 font-medium">Canais</th>
                <th className="py-2 pr-3 font-medium">Inauguração</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {lojas.map((l) => (
                <tr key={l.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3 font-medium">{l.nome}</td>
                  <td className="py-2 pr-3">{STATUS_LABEL[l.status]}</td>
                  <td className="py-2 pr-3">{CANAIS_LABEL[l.canais]}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{l.dataInauguracao ? l.dataInauguracao.split("-").reverse().join("/") : (l.inauguracaoPrevista ?? "—")}</td>
                  <td className="py-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => preencher(l)}>
                      Editar
                    </Button>
                  </td>
                </tr>
              ))}
              {lojas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    Nenhuma loja cadastrada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <form onSubmit={salvar} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={editando ? `Editar ${editando.nome}` : "Nova loja"}>
          <p className="text-sm font-medium sm:col-span-2 lg:col-span-3">{editando ? `Editando ${editando.nome}` : "Nova loja"}</p>
          <div className="space-y-1">
            <Label htmlFor="l-nome">Nome</Label>
            <Input id="l-nome" value={nome} onChange={(e) => { setNome(e.target.value); if (!editando) setIdentificador(slugDe(e.target.value)); }} maxLength={120} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-slug">Identificador (usado nos links)</Label>
            <Input id="l-slug" value={identificador} onChange={(e) => setIdentificador(e.target.value)} disabled={editando != null} maxLength={60} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-ordem">Ordem na tela</Label>
            <Input id="l-ordem" inputMode="numeric" value={ordem} onChange={(e) => setOrdem(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-status">Situação</Label>
            <NativeSelect id="l-status" value={status} onChange={(e) => setStatus(e.target.value as StatusLoja)}>
              {(Object.keys(STATUS_LABEL) as StatusLoja[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-canais">Canais de venda</Label>
            <NativeSelect id="l-canais" value={canais} onChange={(e) => setCanais(e.target.value as CanaisLoja)}>
              {(Object.keys(CANAIS_LABEL) as CanaisLoja[]).map((c) => (
                <option key={c} value={c}>
                  {CANAIS_LABEL[c]}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-ini">Data de inauguração</Label>
            <Input id="l-ini" type="date" value={inauguracao} onChange={(e) => setInauguracao(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-prev">Previsão (texto livre)</Label>
            <Input id="l-prev" value={prevista} onChange={(e) => setPrevista(e.target.value)} maxLength={40} placeholder="nov/2026" />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar loja"}
            </Button>
            {editando ? (
              <Button type="button" variant="ghost" onClick={() => preencher(null)}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </SectionCard>
  );
}

/* ============================================================ parâmetros */

const DIAS: { k: keyof ConfigRede["pesosDiaSemana"]; label: string }[] = [
  { k: "seg", label: "Seg" },
  { k: "ter", label: "Ter" },
  { k: "qua", label: "Qua" },
  { k: "qui", label: "Qui" },
  { k: "sex", label: "Sex" },
  { k: "sab", label: "Sáb" },
  { k: "dom", label: "Dom" },
];

export function ConfigRedeForm({ slug, config }: { slug: string; config: ConfigRede }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [piso, setPiso] = useState(paraTexto(config.pisoLoja));
  const [pesos, setPesos] = useState(() => Object.fromEntries(DIAS.map((d) => [d.k, paraTexto(config.pesosDiaSemana[d.k])])) as Record<string, string>);
  const [tolSem, setTolSem] = useState(paraTexto(config.toleranciaSemaforoPct));
  const [tolCmv, setTolCmv] = useState(paraTexto(config.toleranciaCmv));

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const p = Object.fromEntries(DIAS.map((d) => [d.k, lerNumero(pesos[d.k])]));
    const valores = [lerNumero(piso), lerNumero(tolSem), lerNumero(tolCmv), ...Object.values(p)];
    if (valores.some((v) => v == null)) {
      setMsg({ tipo: "error", texto: "Confira os números: use apenas dígitos, vírgula ou ponto." });
      return;
    }
    iniciar(async () => {
      const r = await salvarConfigAction(slug, {
        pisoLoja: lerNumero(piso)!,
        pesos: p as Record<keyof ConfigRede["pesosDiaSemana"], number>,
        toleranciaCmv: lerNumero(tolCmv)!,
        toleranciaSemaforoPct: lerNumero(tolSem)!,
      });
      if (r.success) {
        setMsg({ tipo: "success", texto: "Parâmetros salvos. Os painéis já usam os novos valores." });
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  return (
    <SectionCard title="Parâmetros do painel" description="Piso de faturamento por loja, peso de cada dia da semana na meta diária e tolerâncias do semáforo.">
      <form onSubmit={salvar} className="space-y-3">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="c-piso">Piso mensal por loja (R$)</Label>
            <Input id="c-piso" inputMode="decimal" value={piso} onChange={(e) => setPiso(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-tol">Semáforo: amarelo até (% fora da meta)</Label>
            <Input id="c-tol" inputMode="decimal" value={tolSem} onChange={(e) => setTolSem(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="c-cmv">Tolerância do CMV (pontos percentuais)</Label>
            <Input id="c-cmv" inputMode="decimal" value={tolCmv} onChange={(e) => setTolCmv(e.target.value)} />
          </div>
        </div>
        <fieldset className="space-y-1">
          <legend className="text-xs font-medium text-muted-foreground">Peso de cada dia da semana na meta diária</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {DIAS.map((d) => (
              <div key={d.k} className="space-y-1">
                <Label htmlFor={`c-${d.k}`}>{d.label}</Label>
                <Input id={`c-${d.k}`} inputMode="decimal" value={pesos[d.k]} onChange={(e) => setPesos((x) => ({ ...x, [d.k]: e.target.value }))} />
              </div>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando…" : "Salvar parâmetros"}
        </Button>
      </form>
    </SectionCard>
  );
}

/* ============================================================ acessos */

const DESCRICAO_PAPEL: Record<Exclude<PapelRede, "administrador">, string> = {
  consultor: "Vê e edita tudo da rede, menos a configuração.",
  diretoria: "Acompanha a rede (somente leitura), sem ocorrências de RH.",
  gerente_regional: "Opera as lojas atribuídas; sem DRE e orçamento.",
  gerente_loja: "Lança e consulta só a(s) sua(s) loja(s).",
  colaborador: "Só os módulos escolhidos, nas lojas atribuídas.",
};

export function AcessosGestao({ slug, lojas, acessos, membros }: { slug: string; lojas: Loja[]; acessos: AcessoLinha[]; membros: MembroLinha[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [userId, setUserId] = useState("");
  const [papel, setPapel] = useState<Exclude<PapelRede, "administrador">>("gerente_loja");
  const [todas, setTodas] = useState(false);
  const [lojaIds, setLojaIds] = useState<string[]>([]);
  const [modulos, setModulos] = useState<string[]>(["dashboard", "vendas"]);

  const nomeLoja = new Map(lojas.map((l) => [l.id, l.nome] as const));
  const alternar = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v]);

  const editar = (a: AcessoLinha) => {
    setUserId(a.userId);
    setPapel(a.papel);
    setTodas(a.todasLojas);
    setLojaIds(a.lojaIds);
    setModulos(a.modulos.length ? a.modulos : ["dashboard", "vendas"]);
    setMsg(null);
  };

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMsg({ tipo: "error", texto: "Escolha a pessoa." });
      return;
    }
    iniciar(async () => {
      const r = await salvarAcessoAction(slug, { userId, papel, todasLojas: todas, lojaIds: todas ? [] : lojaIds, modulos: papel === "colaborador" ? modulos : [] });
      if (r.success) {
        setMsg({ tipo: "success", texto: "Acesso salvo." });
        setUserId("");
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });
  };

  const remover = (a: AcessoLinha) =>
    iniciar(async () => {
      const r = await desativarAcessoAction(slug, a.userId);
      if (r.success) {
        setMsg({ tipo: "success", texto: `Acesso de ${a.nome} removido.` });
        router.refresh();
      } else setMsg({ tipo: "error", texto: r.error });
    });

  return (
    <SectionCard title="Acessos à rede" description="Proprietários e administradores da empresa já têm acesso total. Para os demais, escolha o perfil e as lojas. Convide novas pessoas primeiro em Equipe.">
      <div className="space-y-4">
        {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Pessoa</th>
                <th className="py-2 pr-3 font-medium">Perfil</th>
                <th className="py-2 pr-3 font-medium">Lojas</th>
                <th className="py-2 pr-3 font-medium">Situação</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {acessos.map((a) => (
                <tr key={a.userId} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-3">
                    <span className="font-medium">{a.nome}</span>
                    <span className="block text-xs text-muted-foreground">{a.email}</span>
                  </td>
                  <td className="py-2 pr-3">{PAPEL_LABEL[a.papel]}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{a.todasLojas ? "Todas" : a.lojaIds.map((id) => nomeLoja.get(id) ?? "—").join(", ")}</td>
                  <td className="py-2 pr-3">{a.ativo ? "Ativo" : "Removido"}</td>
                  <td className="py-2 text-right">
                    <Button type="button" variant="ghost" size="sm" onClick={() => editar(a)}>
                      Editar
                    </Button>
                    {a.ativo ? (
                      <Button type="button" variant="ghost" size="sm" disabled={pendente} onClick={() => remover(a)}>
                        Remover
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
              {acessos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    Ninguém além dos administradores tem acesso ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <form onSubmit={salvar} className="grid gap-3 rounded-xl border border-border p-3 sm:grid-cols-2" aria-label="Dar ou alterar acesso">
          <p className="text-sm font-medium sm:col-span-2">Dar ou alterar acesso</p>
          <div className="space-y-1">
            <Label htmlFor="a-pessoa">Pessoa</Label>
            <NativeSelect id="a-pessoa" value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Escolha…</option>
              {membros.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.nome}
                  {m.email && m.email !== m.nome ? ` (${m.email})` : ""}
                </option>
              ))}
            </NativeSelect>
            {membros.length === 0 ? <p className="text-xs text-muted-foreground">Nenhum membro disponível. Convide a pessoa em Equipe.</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="a-papel">Perfil</Label>
            <NativeSelect id="a-papel" value={papel} onChange={(e) => setPapel(e.target.value as typeof papel)}>
              {(Object.keys(DESCRICAO_PAPEL) as (keyof typeof DESCRICAO_PAPEL)[]).map((p) => (
                <option key={p} value={p}>
                  {PAPEL_LABEL[p]}
                </option>
              ))}
            </NativeSelect>
            <p className="text-xs text-muted-foreground">{DESCRICAO_PAPEL[papel]}</p>
          </div>
          <fieldset className="space-y-1 sm:col-span-2">
            <legend className="text-xs font-medium text-muted-foreground">Lojas</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Todas as lojas (inclusive as futuras)
            </label>
            {!todas ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {lojas.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={lojaIds.includes(l.id)} onChange={() => setLojaIds((x) => alternar(x, l.id))} /> {l.nome}
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>
          {papel === "colaborador" ? (
            <fieldset className="space-y-1 sm:col-span-2">
              <legend className="text-xs font-medium text-muted-foreground">Módulos liberados</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {MODULOS_COLABORADOR.map((m) => (
                  <label key={m.k} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={modulos.includes(m.k)} onChange={() => setModulos((x) => alternar(x, m.k))} /> {m.nome}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pendente}>
              {pendente ? "Salvando…" : "Salvar acesso"}
            </Button>
          </div>
        </form>
      </div>
    </SectionCard>
  );
}

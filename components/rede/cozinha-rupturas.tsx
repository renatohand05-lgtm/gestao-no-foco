"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";

import { AcoesExportar } from "@/components/rede/acoes-exportar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SectionCard } from "@/components/ui/section-card";
import { atualizarRupturaAction, excluirRupturaAction, registrarRupturaAction } from "@/lib/rede/actions-cozinha";
import { LINHAS_NO_HISTORICO } from "@/lib/rede/cozinha";
import { lerNumero } from "@/lib/rede/csv";
import { linhasCsvRupturas } from "@/lib/rede/delivery";
import { MOTIVOS_RUPTURA, type Ruptura } from "@/lib/rede/tipos";

type Msg = { tipo: "success" | "error"; texto: string } | null;
type LojaRef = { id: string; nome: string };

const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
const nf1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

type Props = {
  slug: string;
  lojas: LojaRef[];
  /** Rupturas das lojas do filtro, mais recentes primeiro. */
  rupturas: Ruptura[];
  /** Nomes de itens para sugerir no campo (estoque da central e rupturas já registradas). */
  sugestoes: string[];
  hoje: string;
  editavel: boolean;
  /** Loja pré-selecionada (filtro da tela). */
  lojaInicial: string | null;
};

export function CozinhaRupturas({ slug, lojas, rupturas, sugestoes, hoje, editavel, lojaInicial }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<Msg>(null);
  const [editando, setEditando] = useState<Ruptura | null>(null);
  const [excluir, setExcluir] = useState<Ruptura | null>(null);
  const [erroExcluir, setErroExcluir] = useState<string | null>(null);

  const nomeLoja = useMemo(() => new Map(lojas.map((l) => [l.id, l.nome] as const)), [lojas]);
  const nome = (id: string) => nomeLoja.get(id) ?? "Loja";
  const visiveis = rupturas.slice(0, LINHAS_NO_HISTORICO);

  const confirmarExclusao = () => {
    if (!excluir) return;
    setErroExcluir(null);
    iniciar(async () => {
      const r = await excluirRupturaAction(slug, excluir.id);
      if (r.success) {
        setExcluir(null);
        if (editando?.id === excluir.id) setEditando(null);
        setMsg({ tipo: "success", texto: "Ruptura excluída." });
        router.refresh();
      } else setErroExcluir(r.error);
    });
  };

  return (
    <div className="space-y-5">
      {msg ? <FeedbackMessage variant={msg.tipo}>{msg.texto}</FeedbackMessage> : null}

      {editavel ? (
        <SectionCard
          title={editando ? "Editar ruptura" : "Registrar ruptura"}
          description="Uma ruptura é um item que faltou na loja. A mesma loja, dia, item e motivo não são registrados duas vezes: para corrigir horas ou ação, edite o registro."
        >
          <FormularioRuptura
            key={editando?.id ?? "novo"}
            slug={slug}
            lojas={lojas}
            sugestoes={sugestoes}
            hoje={hoje}
            editando={editando}
            lojaInicial={lojaInicial}
            pendente={pendente}
            iniciar={iniciar}
            aoSalvar={(m) => {
              setMsg(m);
              if (m.tipo === "success") {
                setEditando(null);
                router.refresh();
              }
            }}
            aoCancelar={() => setEditando(null)}
          />
        </SectionCard>
      ) : (
        <FeedbackMessage variant="info">Seu perfil pode consultar as rupturas, mas não registrar ou alterar.</FeedbackMessage>
      )}

      <SectionCard title="Registros" description={rupturas.length > visiveis.length ? `Mostrando as ${visiveis.length} mais recentes de ${rupturas.length}. A exportação leva todas.` : `${rupturas.length} ${rupturas.length === 1 ? "registro" : "registros"}.`}>
        <div className="mb-3">
          <AcoesExportar arquivo="rupturas-fat-buddha.csv" linhas={linhasCsvRupturas(rupturas, nome)} />
        </div>
        {rupturas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ruptura registrada.</p>
        ) : (
          <div className="max-h-[440px] overflow-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">Loja</th>
                  <th className="py-2 pr-3 font-medium">Item</th>
                  <th className="py-2 pr-3 font-medium">Motivo</th>
                  <th className="py-2 pr-3 text-right font-medium">Horas</th>
                  <th className="py-2 pr-3 font-medium">Ação</th>
                  {editavel ? <th className="py-2 text-right font-medium">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0 align-top">
                    <td className="py-2 pr-3 tabular-nums">{dmy(r.data)}</td>
                    <td className="py-2 pr-3 font-medium">{nome(r.lojaId)}</td>
                    <td className="py-2 pr-3">
                      {r.item}
                      {r.origem === "exemplo" ? <span className="ml-2 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">EXEMPLO</span> : null}
                    </td>
                    <td className="py-2 pr-3">{r.motivo}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.horas > 0 ? nf1.format(r.horas) : "—"}</td>
                    <td className="py-2 pr-3 whitespace-normal">{r.acao ?? <span className="text-muted-foreground">—</span>}</td>
                    {editavel ? (
                      <td className="py-1 text-right whitespace-nowrap">
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Editar a ruptura de ${r.item} em ${nome(r.lojaId)}`} onClick={() => { setMsg(null); setEditando(r); document.getElementById("ru-item")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                          <Pencil aria-hidden />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Excluir a ruptura de ${r.item} em ${nome(r.lojaId)}`} onClick={() => { setErroExcluir(null); setExcluir(r); }}>
                          <Trash2 aria-hidden />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={excluir != null}
        onOpenChange={(o) => !o && setExcluir(null)}
        title="Excluir esta ruptura?"
        description={excluir ? `${excluir.item} · ${nome(excluir.lojaId)} · ${dmy(excluir.data)}. A exclusão fica registrada no histórico de alterações.` : ""}
        confirmLabel="Excluir"
        loading={pendente}
        error={erroExcluir}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}

/* ============================================================ formulário */

type FormProps = {
  slug: string;
  lojas: LojaRef[];
  sugestoes: string[];
  hoje: string;
  editando: Ruptura | null;
  lojaInicial: string | null;
  pendente: boolean;
  iniciar: (fn: () => void) => void;
  aoSalvar: (m: NonNullable<Msg>) => void;
  aoCancelar: () => void;
};

function FormularioRuptura({ slug, lojas, sugestoes, hoje, editando, lojaInicial, pendente, iniciar, aoSalvar, aoCancelar }: FormProps) {
  const [data, setData] = useState(editando?.data ?? hoje);
  const [lojaId, setLojaId] = useState(editando?.lojaId ?? (lojaInicial && lojas.some((l) => l.id === lojaInicial) ? lojaInicial : (lojas[0]?.id ?? "")));
  const [item, setItem] = useState(editando?.item ?? "");
  const [motivo, setMotivo] = useState<string>(editando?.motivo ?? MOTIVOS_RUPTURA[0]);
  const [horas, setHoras] = useState(editando ? String(editando.horas).replace(".", ",") : "2");
  const [acao, setAcao] = useState(editando?.acao ?? "");

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    const h = horas.trim() === "" ? 0 : lerNumero(horas);
    if (h == null) {
      aoSalvar({ tipo: "error", texto: "Horas indisponível: use apenas dígitos, vírgula ou ponto." });
      return;
    }
    const entrada = { lojaId, data, item, motivo: motivo as (typeof MOTIVOS_RUPTURA)[number], horas: h, acao: acao.trim() || null };
    iniciar(async () => {
      const r = editando ? await atualizarRupturaAction(slug, editando.id, entrada) : await registrarRupturaAction(slug, entrada);
      if (r.success) {
        if (!editando) {
          setItem("");
          setAcao("");
        }
        aoSalvar({ tipo: "success", texto: editando ? "Ruptura atualizada." : "Ruptura registrada." });
      } else aoSalvar({ tipo: "error", texto: r.error });
    });
  };

  return (
    <form onSubmit={salvar} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="space-y-1">
          <Label htmlFor="ru-data">Data</Label>
          <Input id="ru-data" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ru-loja">Loja</Label>
          <NativeSelect id="ru-loja" value={lojaId} onChange={(e) => setLojaId(e.target.value)} required>
            {lojas.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ru-item">Item</Label>
          <Input id="ru-item" list="ru-itens" maxLength={120} placeholder="Item em falta" value={item} onChange={(e) => setItem(e.target.value)} required />
          <datalist id="ru-itens">
            {sugestoes.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ru-motivo">Motivo</Label>
          <NativeSelect id="ru-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            {MOTIVOS_RUPTURA.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ru-horas">Horas indisponível</Label>
          <Input id="ru-horas" inputMode="decimal" value={horas} onChange={(e) => setHoras(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ru-acao">Ação corretiva</Label>
          <Input id="ru-acao" maxLength={300} placeholder="O que foi feito" value={acao} onChange={(e) => setAcao(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pendente || lojas.length === 0}>
          {pendente ? "Salvando…" : editando ? "Salvar alterações" : "Registrar"}
        </Button>
        {editando ? (
          <Button type="button" variant="outline" onClick={aoCancelar} disabled={pendente}>
            Cancelar edição
          </Button>
        ) : null}
      </div>
    </form>
  );
}

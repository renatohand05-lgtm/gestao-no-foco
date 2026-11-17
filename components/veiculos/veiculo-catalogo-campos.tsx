"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  acharMarca,
  acharModelo,
  acharVersao,
  anosPossiveis,
  buscarModelosEmTodasAsMarcas,
  carregarCatalogo,
  filtrar,
  inferirMotorizacao,
  marcaUnicaDoModelo,
  normalizar,
  resumirAnos,
  type Catalogo,
  type CatalogoMarca,
  type CatalogoModelo,
  type CatalogoVersao,
} from "@/lib/veiculos/catalogo";
import { inferirMarcaPeloModelo } from "@/lib/veiculos/modelo-marca";

type Estilo = "dialog" | "quick";

type Opcao<T> = { chave: string; texto: string; detalhe?: string; payload: T };

type CampoProps<T> = {
  id: string;
  rotulo: string;
  name: string;
  valor: string;
  aoDigitar: (valor: string) => void;
  opcoes: Opcao<T>[];
  aoEscolher: (payload: T) => void;
  aoSair?: () => void;
  estilo: Estilo;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  inputRef?: React.Ref<HTMLInputElement>;
};

function Rotulo({
  htmlFor,
  estilo,
  children,
}: {
  htmlFor: string;
  estilo: Estilo;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block", estilo === "dialog" ? "text-sm text-muted-foreground" : "text-xs")}
    >
      {children}
    </label>
  );
}

function classeInput(estilo: Estilo) {
  return estilo === "dialog" ? "mt-1" : "mt-1 h-11";
}

/**
 * Campo de texto livre com lista de sugestões logo abaixo (sem popup flutuante,
 * para não brigar com o foco do Dialog). A pessoa sempre pode digitar o que
 * quiser — a lista só ajuda.
 */
function CampoSugestoes<T>({
  id,
  rotulo,
  name,
  valor,
  aoDigitar,
  opcoes,
  aoEscolher,
  aoSair,
  estilo,
  disabled,
  required,
  placeholder,
  inputRef,
}: CampoProps<T>) {
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(-1);
  const listaId = `${id}-lista`;
  const visiveis = aberto ? opcoes : [];
  const indiceAtivo = ativo < visiveis.length ? ativo : -1;

  useEffect(() => {
    if (indiceAtivo < 0) return;
    document
      .getElementById(`${listaId}-${indiceAtivo}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [indiceAtivo, listaId]);

  function escolher(opcao: Opcao<T>) {
    aoEscolher(opcao.payload);
    setAberto(false);
    setAtivo(-1);
  }

  return (
    <div>
      <Rotulo htmlFor={id} estilo={estilo}>
        {rotulo}
      </Rotulo>
      <Input
        id={id}
        name={name}
        ref={inputRef}
        value={valor}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={visiveis.length > 0}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={indiceAtivo >= 0 ? `${listaId}-${indiceAtivo}` : undefined}
        className={classeInput(estilo)}
        onFocus={() => {
          setAberto(true);
          setAtivo(-1);
        }}
        onBlur={() => {
          setAberto(false);
          aoSair?.();
        }}
        onChange={(e) => {
          aoDigitar(e.target.value);
          setAberto(true);
          setAtivo(-1);
        }}
        onKeyDown={(e) => {
          if (!visiveis.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setAtivo((indiceAtivo + 1) % visiveis.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setAtivo((indiceAtivo - 1 + visiveis.length) % visiveis.length);
          } else if (e.key === "Enter" && indiceAtivo >= 0) {
            e.preventDefault();
            escolher(visiveis[indiceAtivo]);
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setAberto(false);
          }
        }}
      />
      {visiveis.length ? (
        <ul
          id={listaId}
          role="listbox"
          aria-label={rotulo}
          className="mt-1 max-h-52 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-sm"
        >
          {visiveis.map((opcao, i) => (
            <li
              key={opcao.chave}
              id={`${listaId}-${i}`}
              role="option"
              aria-selected={i === indiceAtivo}
              // mousedown não pode tirar o foco do campo antes do clique valer
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => escolher(opcao)}
              className={cn(
                "flex min-h-10 cursor-pointer items-start justify-between gap-2 px-3 py-2 text-sm",
                i === indiceAtivo ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <span className="min-w-0 break-words">{opcao.texto}</span>
              {opcao.detalhe ? (
                <span className="shrink-0 pt-0.5 text-xs text-muted-foreground">
                  {opcao.detalhe}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type VeiculoCatalogoValores = {
  marca: string;
  modelo: string;
  versao: string;
  ano: string;
  combustivel: string;
  cambio: string;
};

type Props = {
  /** Nomes dos campos no FormData (padrão: marca, modelo, versao, ano…). */
  names?: Partial<Record<keyof VeiculoCatalogoValores, string>>;
  estilo?: Estilo;
  disabled?: boolean;
  /** Mostra asterisco e exige o modelo. */
  modeloObrigatorio?: boolean;
  mostrarVersao?: boolean;
  /**
   * "campos": mostra Combustível e Câmbio; "oculto": guarda o que foi deduzido
   * da versão em campos escondidos; "nenhum": não mexe nisso.
   */
  motorizacao?: "campos" | "oculto" | "nenhum";
  defaultValues?: Partial<VeiculoCatalogoValores>;
  className?: string;
};

function anosTexto(modelo: CatalogoModelo): string | undefined {
  if (modelo.de === null || modelo.ate === null) return undefined;
  return modelo.de === modelo.ate ? String(modelo.de) : `${modelo.de}–${modelo.ate}`;
}

function semSoEsteExato<T>(opcoes: Opcao<T>[], digitado: string): Opcao<T>[] {
  // Já escolheu aquele item: não precisa mostrar a lista com ele mesmo.
  if (opcoes.length === 1 && normalizar(opcoes[0].texto) === normalizar(digitado)) return [];
  return opcoes;
}

export function VeiculoCatalogoCampos({
  names,
  estilo = "dialog",
  disabled,
  modeloObrigatorio = false,
  mostrarVersao = true,
  motorizacao = "nenhum",
  defaultValues,
  className,
}: Props) {
  const baseId = useId();
  const nome = {
    marca: names?.marca ?? "marca",
    modelo: names?.modelo ?? "modelo",
    versao: names?.versao ?? "versao",
    ano: names?.ano ?? "ano",
    combustivel: names?.combustivel ?? "combustivel",
    cambio: names?.cambio ?? "cambio",
  };

  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [marca, setMarca] = useState(defaultValues?.marca ?? "");
  const [modelo, setModelo] = useState(defaultValues?.modelo ?? "");
  const [versao, setVersao] = useState(defaultValues?.versao ?? "");
  const [ano, setAno] = useState(defaultValues?.ano ?? "");
  const [combustivel, setCombustivel] = useState(defaultValues?.combustivel ?? "");
  const [cambio, setCambio] = useState(defaultValues?.cambio ?? "");
  // Só preenchemos sozinhos o que a pessoa ainda não escreveu (nem veio salvo).
  const mexeuCombustivel = useRef(Boolean(defaultValues?.combustivel));
  const mexeuCambio = useRef(Boolean(defaultValues?.cambio));
  const modeloRef = useRef<HTMLInputElement>(null);
  const versaoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    carregarCatalogo()
      .then((c) => {
        if (vivo) setCatalogo(c);
      })
      .catch(() => {
        /* sem catálogo, os campos continuam livres */
      });
    return () => {
      vivo = false;
    };
  }, []);

  const marcaCat = acharMarca(catalogo, marca);
  const modeloCat = acharModelo(marcaCat, modelo);
  const versaoCat = acharVersao(modeloCat, versao);

  // ---- sugestões ----
  let opcoesMarca: Opcao<CatalogoMarca>[] = [];
  if (catalogo) {
    const lista = marca.trim() ? filtrar(catalogo.marcas, marca, 12) : catalogo.marcas.slice(0, 12);
    const viaApelido = marcaCat && normalizar(marca) !== marcaCat.busca ? [marcaCat] : [];
    const unicas = [...viaApelido, ...lista.filter((m) => !viaApelido.includes(m))];
    opcoesMarca = semSoEsteExato(
      unicas.map((m) => ({ chave: m.nome, texto: m.nome, payload: m })),
      marca,
    );
  }

  type ModeloPayload = { marca: CatalogoMarca; modelo: CatalogoModelo };
  let opcoesModelo: Opcao<ModeloPayload>[] = [];
  if (catalogo && marcaCat) {
    opcoesModelo = semSoEsteExato(
      filtrar(marcaCat.modelos, modelo, 80).map((m) => ({
        chave: m.nome,
        texto: m.nome,
        detalhe: anosTexto(m),
        payload: { marca: marcaCat, modelo: m },
      })),
      modelo,
    );
  } else if (catalogo) {
    opcoesModelo = buscarModelosEmTodasAsMarcas(catalogo, modelo, 30).map((r) => ({
      chave: `${r.marca.nome}|${r.modelo.nome}`,
      texto: r.modelo.nome,
      detalhe: r.marca.nome,
      payload: r,
    }));
  }

  let opcoesVersao: Opcao<CatalogoVersao>[] = [];
  if (modeloCat) {
    opcoesVersao = semSoEsteExato(
      filtrar(modeloCat.versoes, versao, 80).map((v, i) => ({
        chave: `${i}|${v.nome}`,
        texto: v.nome,
        detalhe: resumirAnos(v.anos) || undefined,
        payload: v,
      })),
      versao,
    );
  }

  const anos = anosPossiveis(modeloCat, versaoCat);

  // ---- ações ----
  function aplicarMotorizacao(nomeVersao: string) {
    const m = inferirMotorizacao(nomeVersao);
    if (m.combustivel && !mexeuCombustivel.current) setCombustivel(m.combustivel);
    if (m.cambio && !mexeuCambio.current) setCambio(m.cambio);
  }

  function escolherMarca(m: CatalogoMarca) {
    setMarca(m.nome);
    modeloRef.current?.focus();
  }

  function escolherModelo({ marca: m, modelo: mod }: ModeloPayload) {
    setMarca(m.nome);
    setModelo(mod.nome);
    if (versao && !acharVersao(mod, versao)) setVersao("");
    if (mostrarVersao && mod.versoes.length) versaoRef.current?.focus();
  }

  function escolherVersao(v: CatalogoVersao) {
    setVersao(v.nome);
    const lista = anosPossiveis(null, v);
    if (!ano && lista.length === 1) setAno(String(lista[0]));
    aplicarMotorizacao(v.nome);
  }

  function aoSairDoModelo() {
    if (marca.trim() || !modelo.trim()) return;
    const deduzida = marcaUnicaDoModelo(catalogo, modelo) ?? inferirMarcaPeloModelo(modelo);
    if (deduzida) setMarca(deduzida);
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)} data-veiculo-catalogo="">
      <CampoSugestoes
        id={`${baseId}-marca`}
        rotulo="Marca"
        name={nome.marca}
        valor={marca}
        aoDigitar={setMarca}
        opcoes={opcoesMarca}
        aoEscolher={escolherMarca}
        estilo={estilo}
        disabled={disabled}
      />
      <CampoSugestoes
        id={`${baseId}-modelo`}
        rotulo={modeloObrigatorio ? "Modelo *" : "Modelo"}
        name={nome.modelo}
        valor={modelo}
        aoDigitar={setModelo}
        opcoes={opcoesModelo}
        aoEscolher={escolherModelo}
        aoSair={aoSairDoModelo}
        estilo={estilo}
        disabled={disabled}
        required={modeloObrigatorio}
        inputRef={modeloRef}
      />
      {mostrarVersao ? (
        <div className="sm:col-span-2">
          <CampoSugestoes
            id={`${baseId}-versao`}
            rotulo="Versão"
            name={nome.versao}
            valor={versao}
            aoDigitar={setVersao}
            opcoes={opcoesVersao}
            aoEscolher={escolherVersao}
            estilo={estilo}
            disabled={disabled}
            inputRef={versaoRef}
          />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <Rotulo htmlFor={`${baseId}-ano`} estilo={estilo}>
          Ano
        </Rotulo>
        <Input
          id={`${baseId}-ano`}
          name={nome.ano}
          type="number"
          inputMode="numeric"
          min={1950}
          max={2100}
          value={ano}
          disabled={disabled}
          onChange={(e) => setAno(e.target.value)}
          className={cn(classeInput(estilo), "sm:max-w-[50%]")}
        />
        {anos.length ? (
          <div
            role="group"
            aria-label="Anos disponíveis"
            className="mt-1.5 flex max-h-[4.75rem] flex-wrap gap-1 overflow-y-auto"
          >
            {anos.map((a) => (
              <button
                key={a}
                type="button"
                disabled={disabled}
                aria-pressed={ano === String(a)}
                onClick={() => setAno(String(a))}
                className={cn(
                  "h-8 min-w-12 rounded-md border px-2 text-xs transition-colors",
                  ano === String(a)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background hover:bg-muted",
                )}
              >
                {a}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {motorizacao === "campos" ? (
        <>
          <div>
            <Rotulo htmlFor={`${baseId}-combustivel`} estilo={estilo}>
              Combustível
            </Rotulo>
            <Input
              id={`${baseId}-combustivel`}
              name={nome.combustivel}
              value={combustivel}
              disabled={disabled}
              onChange={(e) => {
                mexeuCombustivel.current = true;
                setCombustivel(e.target.value);
              }}
              className={classeInput(estilo)}
            />
          </div>
          <div>
            <Rotulo htmlFor={`${baseId}-cambio`} estilo={estilo}>
              Câmbio
            </Rotulo>
            <Input
              id={`${baseId}-cambio`}
              name={nome.cambio}
              value={cambio}
              disabled={disabled}
              onChange={(e) => {
                mexeuCambio.current = true;
                setCambio(e.target.value);
              }}
              className={classeInput(estilo)}
            />
          </div>
        </>
      ) : null}
      {motorizacao === "oculto" ? (
        <>
          <input type="hidden" name={nome.combustivel} value={combustivel} />
          <input type="hidden" name={nome.cambio} value={cambio} />
        </>
      ) : null}
    </div>
  );
}

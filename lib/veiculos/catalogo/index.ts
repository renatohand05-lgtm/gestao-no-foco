/**
 * Catálogo de carros embutido (marca → modelo → versão → anos).
 *
 * Os dados ficam em `carros.json` (gerado por `scripts/gerar-catalogo-veiculos.mjs`
 * a partir da tabela FIPE — só nomes e anos, sem preços). O arquivo é carregado
 * sob demanda (import dinâmico), então só quem abre o cadastro de veículo de uma
 * oficina baixa os ~70 KB comprimidos. Nada aqui chama serviço externo.
 *
 * Este módulo é puro (sem React) para poder ser testado em Node.
 */

type VersaoBruta = [nome: string, anos: string];
type ModeloBruto = [nome: string, versoes: VersaoBruta[]];
type MarcaBruta = [nome: string, modelos: ModeloBruto[]];
export type CatalogoBruto = { v: number; referencia: string; marcas: MarcaBruta[] };

export type CatalogoVersao = {
  nome: string;
  /** Anos no formato compacto da fonte, ex.: "2008-2013,2015". */
  anos: string;
  busca: string;
  compacta: string;
};

export type CatalogoModelo = {
  nome: string;
  busca: string;
  compacta: string;
  versoes: CatalogoVersao[];
  /** Primeiro e último ano em que existem versões (para exibir "2008–2026"). */
  de: number | null;
  ate: number | null;
};

export type CatalogoMarca = {
  nome: string;
  busca: string;
  compacta: string;
  modelos: CatalogoModelo[];
};

export type Catalogo = {
  referencia: string;
  marcas: CatalogoMarca[];
  /** Marca pela chave normalizada (já com apelidos: "vw", "gm"…). */
  porChave: Map<string, CatalogoMarca>;
};

/** Normaliza para comparar: sem acento, minúsculo, pontuação vira espaço. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const APELIDOS_MARCA: Record<string, string> = {
  vw: "volkswagen",
  gm: "chevrolet",
  chevy: "chevrolet",
  mercedes: "mercedes benz",
  benz: "mercedes benz",
  mb: "mercedes benz",
  chery: "caoa chery",
  "land rover": "land rover",
  landrover: "land rover",
  "great wall": "gwm",
};

/** Lê "2008-2013,2015" → [2015, 2013, …, 2008] (mais novo primeiro). */
export function expandirAnos(anos: string): number[] {
  const saida = new Set<number>();
  for (const parte of anos.split(",")) {
    const [a, b] = parte.split("-").map((n) => Number(n));
    if (!Number.isFinite(a)) continue;
    const fim = Number.isFinite(b) ? b : a;
    for (let ano = a; ano <= fim && ano - a < 120; ano++) {
      if (ano >= 1900 && ano <= 2100) saida.add(ano);
    }
  }
  return [...saida].sort((x, y) => y - x);
}

/** Texto curto para a lista: "2008–2013" ou "2015". */
export function resumirAnos(anos: string): string {
  const lista = expandirAnos(anos);
  if (!lista.length) return "";
  const novo = lista[0];
  const antigo = lista[lista.length - 1];
  return novo === antigo ? String(novo) : `${antigo}–${novo}`;
}

export function montarCatalogo(bruto: CatalogoBruto): Catalogo {
  const marcas: CatalogoMarca[] = bruto.marcas.map(([nomeMarca, modelos]) => {
    const buscaMarca = normalizar(nomeMarca);
    return {
      nome: nomeMarca,
      busca: buscaMarca,
      compacta: buscaMarca.replace(/ /g, ""),
      modelos: modelos.map(([nomeModelo, versoes]) => {
        const buscaModelo = normalizar(nomeModelo);
        let de: number | null = null;
        let ate: number | null = null;
        const vs = versoes.map(([nomeVersao, anos]) => {
          const lista = expandirAnos(anos);
          if (lista.length) {
            const min = lista[lista.length - 1];
            const max = lista[0];
            de = de === null ? min : Math.min(de, min);
            ate = ate === null ? max : Math.max(ate, max);
          }
          const buscaVersao = normalizar(nomeVersao);
          return {
            nome: nomeVersao,
            anos,
            busca: buscaVersao,
            compacta: buscaVersao.replace(/ /g, ""),
          };
        });
        return {
          nome: nomeModelo,
          busca: buscaModelo,
          compacta: buscaModelo.replace(/ /g, ""),
          versoes: vs,
          de,
          ate,
        };
      }),
    };
  });

  const porChave = new Map<string, CatalogoMarca>();
  for (const marca of marcas) porChave.set(marca.busca, marca);
  for (const [apelido, alvo] of Object.entries(APELIDOS_MARCA)) {
    const marca = porChave.get(alvo);
    if (marca && !porChave.has(apelido)) porChave.set(apelido, marca);
  }
  return { referencia: bruto.referencia, marcas, porChave };
}

let promessa: Promise<Catalogo> | null = null;

/** Carrega (uma vez) o catálogo. Em caso de falha, libera para tentar de novo. */
export function carregarCatalogo(): Promise<Catalogo> {
  if (!promessa) {
    promessa = import("./carros.json")
      .then((mod) => montarCatalogo((mod.default ?? mod) as unknown as CatalogoBruto))
      .catch((erro) => {
        promessa = null;
        throw erro;
      });
  }
  return promessa;
}

export function acharMarca(catalogo: Catalogo | null, texto: string): CatalogoMarca | null {
  if (!catalogo) return null;
  const chave = normalizar(texto);
  return chave ? (catalogo.porChave.get(chave) ?? null) : null;
}

export function acharModelo(marca: CatalogoMarca | null, texto: string): CatalogoModelo | null {
  if (!marca) return null;
  const chave = normalizar(texto);
  if (!chave) return null;
  return marca.modelos.find((m) => m.busca === chave) ?? null;
}

export function acharVersao(modelo: CatalogoModelo | null, texto: string): CatalogoVersao | null {
  if (!modelo) return null;
  const chave = normalizar(texto);
  if (!chave) return null;
  return modelo.versoes.find((v) => v.busca === chave) ?? null;
}

type Pesquisavel = { busca: string; compacta: string };

/**
 * Filtra por todas as palavras digitadas (qualquer ordem, sem acento). Quem
 * começa com o que foi digitado vem primeiro, depois quem tem a palavra no
 * início de algum termo, depois o resto. Mantém a ordem original no empate.
 */
export function filtrar<T extends Pesquisavel>(itens: T[], consulta: string, limite = 50): T[] {
  const q = normalizar(consulta);
  if (!q) return itens.slice(0, limite);
  const tokens = q.split(" ");
  const qCompacta = q.replace(/ /g, "");
  const pontuados: { item: T; pontos: number; ordem: number }[] = [];
  itens.forEach((item, ordem) => {
    const todos = tokens.every(
      (t) => item.busca.includes(t) || item.compacta.includes(t.replace(/ /g, "")),
    );
    if (!todos) return;
    let pontos = 2;
    if (item.busca.startsWith(q) || item.compacta.startsWith(qCompacta)) pontos = 0;
    else if (tokens.every((t) => (" " + item.busca).includes(" " + t))) pontos = 1;
    pontuados.push({ item, pontos, ordem });
  });
  pontuados.sort((a, b) => a.pontos - b.pontos || a.ordem - b.ordem);
  return pontuados.slice(0, limite).map((p) => p.item);
}

export type ModeloComMarca = { marca: CatalogoMarca; modelo: CatalogoModelo };

/** Busca modelos em todas as marcas (quando a pessoa digita o modelo antes da marca). */
export function buscarModelosEmTodasAsMarcas(
  catalogo: Catalogo,
  consulta: string,
  limite = 30,
): ModeloComMarca[] {
  const q = normalizar(consulta);
  if (q.length < 2) return [];
  const todos: (Pesquisavel & ModeloComMarca)[] = [];
  for (const marca of catalogo.marcas) {
    for (const modelo of marca.modelos) {
      todos.push({
        marca,
        modelo,
        busca: modelo.busca,
        compacta: modelo.compacta,
      });
    }
  }
  return filtrar(todos, consulta, limite).map(({ marca, modelo }) => ({ marca, modelo }));
}

/** Anos possíveis: da versão escolhida ou, sem versão, de todo o modelo. */
export function anosPossiveis(modelo: CatalogoModelo | null, versao: CatalogoVersao | null): number[] {
  if (versao) return expandirAnos(versao.anos);
  if (!modelo) return [];
  const todos = new Set<number>();
  for (const v of modelo.versoes) for (const a of expandirAnos(v.anos)) todos.add(a);
  return [...todos].sort((a, b) => b - a);
}

export type Motorizacao = { combustivel?: string; cambio?: string };

/**
 * Chute educado de combustível e câmbio a partir do nome da versão (a FIPE
 * escreve coisas como "1.0 Flex 12V Mec." ou "2.0 TDI Aut."). Só devolve o que
 * dá para afirmar; o resto fica em branco para a pessoa preencher.
 */
export function inferirMotorizacao(versao: string): Motorizacao {
  // "Mec." / "Aut." perdem o ponto final; "1.0" mantém o ponto entre números.
  const t = ` ${normalizar(versao).replace(/(?<!\d)\.|\.(?!\d)/g, " ").replace(/\s+/g, " ")} `;
  const saida: Motorizacao = {};

  if (/ (hibrido|hybrid|phev|mhev|hev) /.test(t)) saida.combustivel = "Híbrido";
  else if (/ (eletrico|ev|bev) /.test(t)) saida.combustivel = "Elétrico";
  else if (/ (diesel|tdi|tdci|crdi|dci|hdi|cdi|td) /.test(t)) saida.combustivel = "Diesel";
  else if (/ (flex|flexpower|flexfuel|totalflex|tetrafuel|bifuel) /.test(t)) saida.combustivel = "Flex";
  else if (/ (alcool|etanol) /.test(t)) saida.combustivel = "Etanol";
  else if (/ gasolina /.test(t)) saida.combustivel = "Gasolina";

  if (/ (aut|automatico|automatica|tiptronic|steptronic|cvt|dsg|s tronic|dualogic|powershift|multitronic|at|e cvt) /.test(t)) {
    saida.cambio = "Automático";
  } else if (/ (mec|manual|mt) /.test(t)) {
    saida.cambio = "Manual";
  }
  return saida;
}

/** Se o modelo digitado existe em UMA só marca do catálogo, devolve essa marca. */
export function marcaUnicaDoModelo(catalogo: Catalogo | null, texto: string): string | null {
  if (!catalogo) return null;
  const chave = normalizar(texto);
  if (!chave) return null;
  let achada: string | null = null;
  for (const marca of catalogo.marcas) {
    if (marca.modelos.some((m) => m.busca === chave)) {
      if (achada) return null;
      achada = marca.nome;
    }
  }
  return achada;
}

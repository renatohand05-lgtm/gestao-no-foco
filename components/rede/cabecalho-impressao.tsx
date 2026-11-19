/**
 * Cabeçalho que só aparece ao imprimir (ou salvar em PDF): cliente, período/filtros, unidades, data de geração e
 * de onde vêm os números. Na tela fica escondido.
 */
export function CabecalhoImpressao({
  titulo,
  cliente,
  filtros,
  unidades,
  geradoEm,
  origemDados,
}: {
  titulo: string;
  cliente: string;
  /** Período e filtros aplicados, em texto corrido. */
  filtros: string;
  unidades: string;
  /** Data e hora da geração, já formatadas. */
  geradoEm: string;
  origemDados: string;
}) {
  return (
    <header className="mb-4 hidden border-b border-border pb-3 text-sm print:block" aria-hidden>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Gestão no Foco · Rede de lojas</p>
      <h1 className="text-xl font-semibold">{titulo}</h1>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="font-medium">Cliente</dt>
        <dd>{cliente}</dd>
        <dt className="font-medium">Período e filtros</dt>
        <dd>{filtros}</dd>
        <dt className="font-medium">Unidades</dt>
        <dd>{unidades}</dd>
        <dt className="font-medium">Gerado em</dt>
        <dd>{geradoEm}</dd>
        <dt className="font-medium">Origem dos dados</dt>
        <dd>{origemDados}</dd>
      </dl>
    </header>
  );
}

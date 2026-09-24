import type { OrdemServicoDetail } from "@/lib/ordens/ordem-servico-service";

type Props = {
  os: OrdemServicoDetail;
  empresaNome?: string;
  workOrderLabel: string;
  responsavelNome?: string | null;
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string): string {
  try {
    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

/**
 * Recibo/comanda pronto pra impressão térmica (80mm) ou A4.
 * Fica escondido na tela normal — só aparece quando a página está sendo
 * impressa (ver print.css / @media print no componente que o envolve).
 */
export function OsPrintReceipt({
  os,
  empresaNome,
  workOrderLabel,
  responsavelNome,
}: Props) {
  return (
    <div id="os-print-receipt" className="print-only">
      <div className="receipt">
        <header className="receipt-header">
          {empresaNome ? <p className="receipt-empresa">{empresaNome}</p> : null}
          <p className="receipt-titulo">
            {workOrderLabel} #{os.numero}
          </p>
          <p className="receipt-data">{formatDateTime(os.data_abertura)}</p>
        </header>

        <hr />

        <div className="receipt-info">
          <p>
            <strong>Cliente:</strong> {os.cliente_nome ?? "—"}
          </p>
          {os.modelo ? (
            <p>
              <strong>Veículo:</strong> {os.modelo}
              {os.placa ? ` · ${os.placa}` : ""}
            </p>
          ) : null}
          {responsavelNome ? (
            <p>
              <strong>Responsável:</strong> {responsavelNome}
            </p>
          ) : null}
        </div>

        <hr />

        <table className="receipt-itens">
          <thead>
            <tr>
              <th className="col-desc">Item</th>
              <th className="col-qtd">Qtd</th>
              <th className="col-total">Total</th>
            </tr>
          </thead>
          <tbody>
            {os.itens.map((item) => (
              <tr key={item.id}>
                <td className="col-desc">{item.descricao}</td>
                <td className="col-qtd">{item.quantidade}</td>
                <td className="col-total">{formatCurrency(item.valor_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr />

        <div className="receipt-totais">
          <p>
            <span>Subtotal</span>
            <span>{formatCurrency(os.subtotal)}</span>
          </p>
          {os.desconto_total > 0 ? (
            <p>
              <span>Desconto</span>
              <span>-{formatCurrency(os.desconto_total)}</span>
            </p>
          ) : null}
          {os.acrescimo_total > 0 ? (
            <p>
              <span>Acréscimo</span>
              <span>+{formatCurrency(os.acrescimo_total)}</span>
            </p>
          ) : null}
          <p className="receipt-total-final">
            <span>Total</span>
            <span>{formatCurrency(os.valor_total)}</span>
          </p>
        </div>

        {os.observacoes ? (
          <>
            <hr />
            <p className="receipt-obs">{os.observacoes}</p>
          </>
        ) : null}

        <p className="receipt-footer">Gestão no Foco · gestaonofoco.com.br</p>
      </div>

      <style>{`
        .print-only { display: none; }

        @media print {
          /* Esconde o resto da página, mostra só o recibo. */
          body > *:not(#os-print-receipt-portal) { display: none !important; }
          #os-print-receipt-portal { display: block !important; }
          .print-only { display: block !important; }

          @page { size: 80mm auto; margin: 4mm; }

          .receipt {
            width: 100%;
            font-family: "Courier New", monospace;
            font-size: 11px;
            color: #000;
          }
          .receipt-header { text-align: center; margin-bottom: 6px; }
          .receipt-empresa { font-weight: 700; font-size: 13px; margin: 0; }
          .receipt-titulo { font-weight: 700; margin: 2px 0; }
          .receipt-data { margin: 0; font-size: 10px; }
          hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
          .receipt-info p { margin: 2px 0; }
          .receipt-itens { width: 100%; border-collapse: collapse; margin: 4px 0; }
          .receipt-itens th { text-align: left; font-size: 10px; border-bottom: 1px solid #000; padding-bottom: 2px; }
          .receipt-itens td { padding: 2px 0; vertical-align: top; }
          .col-qtd { text-align: center; width: 15%; }
          .col-total { text-align: right; width: 25%; }
          .receipt-totais p { display: flex; justify-content: space-between; margin: 2px 0; }
          .receipt-total-final { font-weight: 700; font-size: 13px; }
          .receipt-obs { font-size: 10px; white-space: pre-wrap; }
          .receipt-footer { text-align: center; font-size: 9px; margin-top: 8px; }
        }
      `}</style>
    </div>
  );
}

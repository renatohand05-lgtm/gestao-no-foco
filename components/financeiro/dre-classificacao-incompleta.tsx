import { ActionButton } from "@/components/ui/action-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateOnly } from "@/lib/financeiro/format";
import type { DreClassificacaoIncompleta } from "@/types/dre";

type Props = {
  tenantSlug: string;
  lancamentos: DreClassificacaoIncompleta[];
};

export function DreClassificacaoIncompleta({
  tenantSlug,
  lancamentos,
}: Props) {
  return (
    <Card id="classificacao-incompleta">
      <CardHeader>
        <CardTitle>Classificação incompleta</CardTitle>
        <CardDescription>
          Lançamentos que ainda não podem ser classificados corretamente no DRE.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lancamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todos os lançamentos financeiros estão classificados.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origem</TableHead>
                <TableHead>Lançamento</TableHead>
                <TableHead>Competência</TableHead>
                <TableHead>Campos pendentes</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map((lancamento) => {
                const segmento =
                  lancamento.origem === "conta-receber"
                    ? "contas-receber"
                    : "contas-pagar";

                return (
                  <TableRow key={`${lancamento.origem}-${lancamento.id}`}>
                    <TableCell>
                      {lancamento.origem === "conta-receber"
                        ? "Conta a receber"
                        : "Conta a pagar"}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">#{lancamento.numero}</span>
                      <span className="ml-2 text-muted-foreground">
                        {lancamento.descricao}
                      </span>
                    </TableCell>
                    <TableCell>
                      {formatDateOnly(lancamento.data_competencia)}
                    </TableCell>
                    <TableCell>
                      {lancamento.campos_faltantes.join(", ")}
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton
                        action="edit"
                        label="Corrigir"
                        size="sm"
                        href={`/${tenantSlug}/financeiro/${segmento}/${lancamento.id}/editar`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

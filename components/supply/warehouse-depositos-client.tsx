"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSupplyDepositoAction } from "@/lib/supply/supply-enterprise-actions";

type Row = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
};

type Props = {
  tenantSlug: string;
  ready: boolean;
  initialRows: Row[];
};

export function WarehouseDepositosClient({
  tenantSlug,
  ready,
  initialRows,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");

  if (!ready) return null;

  async function create() {
    setError(null);
    try {
      await createSupplyDepositoAction(tenantSlug, {
        nome: nome.trim(),
        codigo: codigo.trim(),
      });
      setNome("");
      setCodigo("");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar depósito");
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <Input
          aria-label="Nome do depósito"
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <Input
          aria-label="Código do depósito"
          placeholder="Código"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
        />
        <Button
          type="button"
          disabled={pending || !nome.trim() || !codigo.trim()}
          onClick={() => void create()}
        >
          Novo depósito
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        {initialRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum depósito.</p>
        ) : (
          initialRows.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between border-b py-2 text-sm"
            >
              <div>
                <div className="font-medium">{d.nome}</div>
                <div className="text-muted-foreground">{d.codigo}</div>
              </div>
              <Badge variant={d.ativo ? "default" : "outline"}>
                {d.ativo ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

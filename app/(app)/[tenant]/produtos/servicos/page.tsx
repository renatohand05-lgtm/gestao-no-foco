import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ tenant: string }>;
};

/** Atalho Sprint 27.8 — filtra hub em Serviços. */
export default async function ServicosAliasPage({ params }: Props) {
  const { tenant } = await params;
  redirect(`/${tenant}/produtos?tipo=servico`);
}

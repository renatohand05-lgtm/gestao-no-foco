import { ModuleHeader } from "@/components/layout/module-header";
import { NfeUploadForm } from "@/components/nfe/nfe-upload-form";
import { SectionCard } from "@/components/ui/section-card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Nova NF-e" };

type Props = { params: Promise<{ tenant: string }> };

export default async function NfeNovaPage({ params }: Props) {
  const { tenant: tenantSlug } = await params;
  await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Upload de XML"
        description="Somente XML de NF-e. Processamento no servidor com proteção XXE. Sem OCR/SEFAZ nesta versão."
      />
      <SectionCard title="Arquivo" contentClassName="pt-0">
        <NfeUploadForm tenantSlug={tenantSlug} />
      </SectionCard>
    </div>
  );
}

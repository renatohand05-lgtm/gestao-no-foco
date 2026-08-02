import { EnterpriseOnboardingWizard } from "@/components/onboarding/enterprise/enterprise-onboarding-wizard";
import { getEnterpriseOnboardingSession } from "@/lib/onboarding/enterprise/actions";

export const metadata = {
  title: "Primeiro acesso",
};

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function PrimeiroAcessoPage({ params }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const session = await getEnterpriseOnboardingSession(tenantSlug);

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Não foi possível carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Verifique se você está autenticado e se a empresa foi criada. Tente
          abrir o Dashboard e voltar a esta página.
        </p>
        <a
          className="mt-4 inline-block text-sm font-medium text-blue-700 underline"
          href={`/${tenantSlug}/dashboard`}
        >
          Ir ao Dashboard
        </a>
      </div>
    );
  }

  return (
    <EnterpriseOnboardingWizard tenantSlug={tenantSlug} session={session} />
  );
}

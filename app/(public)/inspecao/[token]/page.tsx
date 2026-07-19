import { headers } from "next/headers";

import { InspecaoPublicaClient } from "@/components/ordens/inspecao/inspecao-publica-client";
import { aprovacaoPublicaService } from "@/lib/ordens/aprovacao-publica-service";

export const metadata = {
  title: "Inspeção do veículo",
  robots: { index: false, follow: false },
};

function extractClientIp(headerStore: Headers): string | null {
  const forwarded = headerStore.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return headerStore.get("x-real-ip");
}

export default async function InspecaoPublicaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const headerStore = await headers();
  const ip = extractClientIp(headerStore);

  let payload;
  try {
    payload = await aprovacaoPublicaService.loadByToken(token, ip);
  } catch (error) {
    return (
      <InspecaoPublicaClient
        token={token}
        data={null}
        errorCode={
          error instanceof Error && error.message.includes("Muitas tentativas")
            ? "rate_limit"
            : "token_invalido"
        }
      />
    );
  }

  if (!payload.ok) {
    return (
      <InspecaoPublicaClient
        token={token}
        data={payload}
        errorCode={payload.error ?? "token_invalido"}
      />
    );
  }

  return <InspecaoPublicaClient token={token} data={payload} />;
}
